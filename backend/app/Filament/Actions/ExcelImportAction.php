<?php

namespace App\Filament\Actions;

use App\Filament\Imports\ProductImporter;
use App\Models\Category;
use Closure;
use DateTimeInterface;
use Filament\Actions\ImportAction;
use Filament\Actions\Imports\ImportColumn;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Schemas\Components\Fieldset;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use League\Csv\Reader as CsvReader;
use League\Csv\Statement;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

class ExcelImportAction extends ImportAction
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->schema(fn (ImportAction $action): array => array_merge(
            [
                FileUpload::make('file')
                    ->label(__('filament-actions::import.modal.form.file.label'))
                    ->placeholder('اسحب وأفلت ملف Excel (.xlsx) أو CSV هنا أو اضغط للاختيار')
                    ->acceptedFileTypes([
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.ms-excel',
                        'application/octet-stream',
                        'text/csv',
                        'text/x-csv',
                        'application/csv',
                        'application/x-csv',
                        'text/comma-separated-values',
                        'text/x-comma-separated-values',
                        'text/plain',
                    ])
                    ->rules($action->getFileValidationRules())
                    ->afterStateUpdated(function (FileUpload $component, Component $livewire, Set $set, ?TemporaryUploadedFile $state) use ($action): void {
                        if (!$state instanceof TemporaryUploadedFile) {
                            return;
                        }

                        try {
                            $livewire->validateOnly($component->getStatePath());
                        } catch (ValidationException $exception) {
                            $component->state([]);

                            throw $exception;
                        }

                        $csvStream = $this->getUploadedFileStream($state);
                        if (!$csvStream) {
                            return;
                        }

                        $csvReader = CsvReader::from($csvStream);
                        if (filled($csvDelimiter = $this->getCsvDelimiter($csvReader))) {
                            $csvReader->setDelimiter($csvDelimiter);
                        }

                        $csvReader->setHeaderOffset($action->getHeaderOffset() ?? 0);
                        $csvColumns = $csvReader->getHeader();

                        $normalizedCsvColumnValues = array_map(
                            fn ($col) => Str::lower(trim((string) preg_replace('/^\xEF\xBB\xBF/', '', (string) $col))),
                            $csvColumns,
                        );
                        $lowercaseCsvColumnKeys = array_combine(
                            $normalizedCsvColumnValues,
                            $csvColumns,
                        );

                        $importerClass = $action->getImporter();

                        $set('columnMap', array_reduce($importerClass::getColumns(), function (array $carry, ImportColumn $column) use ($lowercaseCsvColumnKeys, $normalizedCsvColumnValues) {
                            $carry[$column->getName()] = $lowercaseCsvColumnKeys[
                                Arr::first(
                                    array_intersect(
                                        $normalizedCsvColumnValues,
                                        $column->getGuesses(),
                                    ),
                                )
                            ] ?? null;

                            return $carry;
                        }, []));

                        // Auto-detect suggested main parent category when importing products
                        if ($importerClass === ProductImporter::class) {
                            $sampleRows = iterator_to_array(
                                (new Statement)->limit(10)->process($csvReader)->getRecords()
                            );
                            $detectedMain = ProductImporter::detectMainCategoryName(
                                $state->getClientOriginalName(),
                                $sampleRows,
                            );

                            if ($detectedMain !== null && $detectedMain !== '') {
                                $existingRoot = Category::query()
                                    ->whereNull('parent_id')
                                    ->where('name', $detectedMain)
                                    ->first();

                                if ($existingRoot) {
                                    $set('parent_category_id', $existingRoot->id);
                                    $set('parent_category_name', $detectedMain);
                                } else {
                                    $set('parent_category_id', null);
                                    $set('parent_category_name', $detectedMain);
                                }
                                $set('nest_under_parent', true);
                            }
                        }
                    })
                    ->storeFiles(false)
                    ->visibility('private')
                    ->required()
                    ->hiddenLabel(),
            ],
            $action->getImporter()::getOptionsFormComponents(),
            [
                Fieldset::make(__('filament-actions::import.modal.form.columns.label'))
                    ->columns(1)
                    ->inlineLabel()
                    ->schema(function (Get $get) use ($action): array {
                        $csvFile = $get('file');
                        if (!$csvFile instanceof TemporaryUploadedFile) {
                            return [];
                        }

                        $csvStream = $this->getUploadedFileStream($csvFile);
                        if (!$csvStream) {
                            return [];
                        }

                        $csvReader = CsvReader::from($csvStream);
                        if (filled($csvDelimiter = $this->getCsvDelimiter($csvReader))) {
                            $csvReader->setDelimiter($csvDelimiter);
                        }

                        $csvReader->setHeaderOffset($action->getHeaderOffset() ?? 0);
                        $csvColumns = $csvReader->getHeader();
                        $csvColumnOptions = array_combine($csvColumns, $csvColumns);

                        return array_map(
                            fn (ImportColumn $column): Select => $column->getSelect()->options($csvColumnOptions),
                            $action->getImporter()::getColumns(),
                        );
                    })
                    ->statePath('columnMap')
                    ->visible(fn (Get $get): bool => $get('file') instanceof TemporaryUploadedFile),
            ],
        ));
    }

    public function getFileValidationRules(): array
    {
        $fileRules = [
            'extensions:xlsx,csv,txt',
            fn (): Closure => function (string $attribute, mixed $value, Closure $fail): void {
                if (!$value instanceof TemporaryUploadedFile) {
                    return;
                }

                $csvStream = $this->getUploadedFileStream($value);
                if (!$csvStream) {
                    return;
                }

                $csvReader = CsvReader::from($csvStream);
                if (filled($csvDelimiter = $this->getCsvDelimiter($csvReader))) {
                    $csvReader->setDelimiter($csvDelimiter);
                }

                $csvReader->setHeaderOffset($this->getHeaderOffset() ?? 0);
                $csvColumns = $csvReader->getHeader();

                $duplicateCsvColumns = [];
                foreach (array_count_values($csvColumns) as $header => $count) {
                    if ($count > 1) {
                        $duplicateCsvColumns[] = $header;
                    }
                }

                $filledDuplicateCsvColumns = array_filter($duplicateCsvColumns, fn ($v): bool => filled($v));
                if (!empty($filledDuplicateCsvColumns)) {
                    $fail(trans_choice('filament-actions::import.modal.form.file.rules.duplicate_columns', count($filledDuplicateCsvColumns), [
                        'columns' => implode(', ', $filledDuplicateCsvColumns),
                    ]));
                }
            },
        ];

        foreach ($this->fileValidationRules as $rules) {
            $rules = $this->evaluate($rules);
            if (is_string($rules)) {
                $rules = explode('|', $rules);
            }
            $fileRules = [...$fileRules, ...$rules];
        }

        return $fileRules;
    }

    public function getUploadedFileStream(TemporaryUploadedFile $file)
    {
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $realPath = $file->getRealPath();

        if ($realPath && ($ext === 'xlsx' || $this->isZipFile($realPath))) {
            return $this->convertXlsxToCsvStream($realPath);
        }

        return parent::getUploadedFileStream($file);
    }

    private function isZipFile(string $path): bool
    {
        $fh = @fopen($path, 'rb');
        if (!$fh) {
            return false;
        }
        $magic = fread($fh, 4);
        fclose($fh);

        return $magic === "PK\x03\x04";
    }

    /**
     * Converts an .xlsx workbook (single or multi-sheet) into an in-memory UTF-8 CSV stream.
     *
     * @return resource|false
     */
    public function convertXlsxToCsvStream(string $xlsxPath)
    {
        $stream = fopen('php://temp', 'r+b');
        if (!$stream) {
            return false;
        }

        $reader = new XlsxReader();
        $reader->open($xlsxPath);

        $headerRow = null;
        $headerCount = 0;

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                $checkedSheetHeader = false;

                foreach ($sheet->getRowIterator() as $row) {
                    $rawCells = $row->toArray();
                    $values = array_map(function ($cell): string {
                        if ($cell instanceof DateTimeInterface) {
                            return $cell->format('Y-m-d H:i:s');
                        }
                        if (is_bool($cell)) {
                            return $cell ? '1' : '0';
                        }
                        return trim((string) ($cell ?? ''));
                    }, $rawCells);

                    // Skip completely blank rows
                    if (empty(array_filter($values, fn (string $v) => $v !== ''))) {
                        continue;
                    }

                    if ($headerRow === null) {
                        // Trim trailing empty header columns and ensure unique non-empty names
                        while (!empty($values) && end($values) === '') {
                            array_pop($values);
                        }
                        foreach ($values as $idx => $colName) {
                            if ($colName === '') {
                                $values[$idx] = 'col_' . ($idx + 1);
                            }
                        }
                        $headerRow = $values;
                        $headerCount = count($headerRow);
                        if ($headerCount === 0) {
                            continue;
                        }
                        $checkedSheetHeader = true;
                        fputcsv($stream, $headerRow);
                        continue;
                    }

                    $normalized = array_pad(array_slice($values, 0, $headerCount), $headerCount, '');

                    // On subsequent sheets, verify the sheet shares the same product columns; skip summary/report sheets
                    if (!$checkedSheetHeader) {
                        $checkedSheetHeader = true;
                        if ($normalized === $headerRow) {
                            continue;
                        }
                        // Non-matching header on a secondary sheet (e.g. category statistics sheet) -> skip sheet
                        $overlap = count(array_intersect(array_filter($values), $headerRow));
                        if ($overlap < min(3, $headerCount)) {
                            break;
                        }
                    }

                    // Skip repeated header row anywhere in the sheet
                    if ($normalized === $headerRow) {
                        continue;
                    }

                    fputcsv($stream, $normalized);
                }
            }
        } finally {
            $reader->close();
        }

        rewind($stream);
        return $stream;
    }
}
