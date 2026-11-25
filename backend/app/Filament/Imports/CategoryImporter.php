<?php

namespace App\Filament\Imports;

use App\Models\Category;
use Filament\Actions\Imports\ImportColumn;
use Filament\Actions\Imports\Importer;
use Filament\Actions\Imports\Models\Import;

class CategoryImporter extends Importer
{
    protected static ?string $model = Category::class;

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('name')
                ->label('اسم القسم (عربي)')
                ->requiredMapping()
                ->rules(['required', 'max:300'])
                ->example('المواد الغذائية'),

            ImportColumn::make('name_en')
                ->label('اسم القسم (إنجليزي)')
                ->rules(['nullable', 'max:300'])
                ->example('Groceries'),

            ImportColumn::make('slug')
                ->label('الرابط (Slug)')
                ->rules(['nullable', 'max:300'])
                ->example('groceries'),

            ImportColumn::make('parent_name')
                ->label('اسم القسم الأب (اختياري)')
                ->fillRecordUsing(fn () => null)
                ->example(''),

            ImportColumn::make('description')
                ->label('الوصف')
                ->rules(['nullable'])
                ->example('جميع المنتجات الغذائية الأساسية'),

            ImportColumn::make('external_image_url')
                ->label('رابط الصورة')
                ->rules(['nullable', 'max:1000'])
                ->example('https://example.com/cat.jpg'),

            ImportColumn::make('sort_order')
                ->label('الترتيب')
                ->integer()
                ->rules(['nullable', 'integer'])
                ->example('0'),

            ImportColumn::make('is_active')
                ->label('مفعّل (1 أو 0)')
                ->boolean()
                ->example('1'),
        ];
    }

    public function resolveRecord(): ?Category
    {
        if (!empty($this->data['slug'])) {
            $existing = Category::where('slug', trim((string) $this->data['slug']))->first();
            if ($existing) {
                return $existing;
            }
        }

        $name = trim((string) ($this->data['name'] ?? ''));
        if ($name !== '') {
            $existing = Category::where('name', $name)->first();
            if ($existing) {
                return $existing;
            }
        }

        return new Category();
    }

    protected function beforeSave(): void
    {
        $this->record->sort_order = $this->record->sort_order ?? 0;
        $this->record->is_active = $this->record->is_active ?? true;

        $parentName = trim((string) ($this->data['parent_name'] ?? ''));
        if ($parentName !== '') {
            $parent = Category::where('name', $parentName)->orWhere('slug', $parentName)->first();
            if (!$parent) {
                $parent = Category::create([
                    'name'      => $parentName,
                    'is_active' => true,
                ]);
            }
            $this->record->parent_id = $parent->id;
        }
    }

    public static function getCompletedNotificationBody(Import $import): string
    {
        $count = number_format($import->successful_rows);
        $body = "تم استيراد وتحديث {$count} قسم بنجاح.";

        if ($failedRowsCount = $import->getFailedRowsCount()) {
            $body .= ' تعذّر استيراد ' . number_format($failedRowsCount) . ' صف.';
        }

        return $body;
    }
}
