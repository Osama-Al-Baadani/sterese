<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategoryResource\Pages;
use App\Models\Category;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-folder-open';
    protected static ?string                 $navigationLabel  = 'الأقسام والتصنيفات';
    protected static \UnitEnum|string|null   $navigationGroup  = 'كتالوج المتجر';
    protected static ?int                    $navigationSort   = 2;
    protected static ?string                 $modelLabel       = 'قسم';
    protected static ?string                 $pluralModelLabel = 'الأقسام والتصنيفات';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('parent')->withCount('products');
    }

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Section::make('بيانات القسم الأساسية')->schema([
                Grid::make(2)->schema([
                    TextInput::make('name')
                        ->label('اسم القسم (عربي)')
                        ->required()
                        ->maxLength(300)
                        ->placeholder('مثال: المواد الغذائية'),

                    TextInput::make('name_en')
                        ->label('اسم القسم (إنجليزي — اختياري)')
                        ->maxLength(300)
                        ->placeholder('Example: Groceries'),

                    Select::make('parent_id')
                        ->label('القسم الأب (للتصنيفات الفرعية)')
                        ->searchable()
                        ->preload()
                        ->placeholder('قسم رئيسي (بدون أب)')
                        ->options(fn (?Category $record) => Category::query()
                            ->when($record?->exists, fn ($q) => $q->where('id', '!=', $record->id))
                            ->orderBy('sort_order')
                            ->orderBy('name')
                            ->pluck('name', 'id')
                            ->toArray()),

                    TextInput::make('slug')
                        ->label('الرابط المختصر (Slug)')
                        ->maxLength(300)
                        ->placeholder('يُولَّد تلقائياً إن تُرك فارغاً')
                        ->helperText('اتركه فارغاً ليتم توليده تلقائياً من الاسم'),
                ]),

                Textarea::make('description')
                    ->label('وصف القسم (اختياري)')
                    ->rows(3)
                    ->columnSpanFull(),
            ]),

            Section::make('صورة القسم')->schema([
                Grid::make(2)->schema([
                    FileUpload::make('image_path')
                        ->label('ارفع صورة القسم')
                        ->image()
                        ->disk('public')
                        ->directory('categories')
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                        ->maxSize(2048)
                        ->helperText('مربع مفضّل (600×600) — بحد أقصى 2MB'),

                    TextInput::make('external_image_url')
                        ->label('أو رابط صورة خارجي (اختياري)')
                        ->url()
                        ->maxLength(1000)
                        ->placeholder('https://...')
                        ->helperText('إذا رفعت صورة أعلاه اترك هذا الحقل فارغاً'),
                ]),
            ]),

            Section::make('إعدادات الظهور والترتيب')->schema([
                Grid::make(2)->schema([
                    TextInput::make('sort_order')
                        ->label('ترتيب العرض (الأصغر يظهر أولاً)')
                        ->numeric()
                        ->default(0),

                    Toggle::make('is_active')
                        ->label('مفعّل في المتجر والتطبيق')
                        ->default(true),
                ]),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('image_url')
                    ->label('الصورة')
                    ->circular()
                    ->height(42)
                    ->width(42),

                TextColumn::make('name')
                    ->label('اسم القسم')
                    ->description(fn (Category $record) => $record->name_en ?: $record->slug)
                    ->searchable(['name', 'name_en', 'slug'])
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('parent.name')
                    ->label('القسم الأب')
                    ->placeholder('رئيسي')
                    ->badge()
                    ->color(fn ($state) => $state ? 'gray' : 'info'),

                TextColumn::make('products_count')
                    ->label('المنتجات')
                    ->sortable()
                    ->badge()
                    ->color(fn ($state) => $state > 0 ? 'success' : 'gray'),

                TextColumn::make('sort_order')
                    ->label('الترتيب')
                    ->sortable(),

                ToggleColumn::make('is_active')
                    ->label('مفعّل'),
            ])
            ->filters([
                TernaryFilter::make('root_only')
                    ->label('المستوى')
                    ->placeholder('الكل')
                    ->trueLabel('الأقسام الرئيسية فقط')
                    ->falseLabel('الأقسام الفرعية فقط')
                    ->queries(
                        true: fn (Builder $q) => $q->whereNull('parent_id'),
                        false: fn (Builder $q) => $q->whereNotNull('parent_id'),
                    ),
                SelectFilter::make('parent_id')
                    ->label('حسب القسم الأب')
                    ->options(fn () => Category::whereNull('parent_id')->orderBy('name')->pluck('name', 'id')->toArray()),
                TernaryFilter::make('is_active')
                    ->label('الحالة'),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->actions([
                EditAction::make()->label('تعديل'),
                DeleteAction::make()->label('حذف'),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('حذف المحدد'),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCategories::route('/'),
            'create' => Pages\CreateCategory::route('/create'),
            'edit'   => Pages\EditCategory::route('/{record}/edit'),
        ];
    }
}
