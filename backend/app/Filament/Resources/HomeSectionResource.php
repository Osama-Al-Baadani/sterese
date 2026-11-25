<?php

namespace App\Filament\Resources;

use App\Filament\Resources\HomeSectionResource\Pages;
use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\HomeSection;
use App\Models\Product;
use App\Models\Tag;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class HomeSectionResource extends Resource
{
    protected static ?string $model = HomeSection::class;

    protected static string|\BackedEnum|null $navigationIcon   = 'heroicon-o-view-columns';
    protected static ?string                 $navigationLabel  = 'أقسام الرئيسية';
    protected static \UnitEnum|string|null   $navigationGroup  = 'واجهة المتجر والتطبيق';
    protected static ?int                    $navigationSort   = 2;
    protected static ?string                 $modelLabel       = 'قسم';
    protected static ?string                 $pluralModelLabel = 'أقسام الصفحة الرئيسية';

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Grid::make(2)->schema([
                TextInput::make('title')
                    ->label('عنوان القسم')
                    ->required()
                    ->maxLength(100)
                    ->placeholder('مثال: ألبان ومعلبات'),
                TextInput::make('icon')
                    ->label('أيقونة (Emoji)')
                    ->maxLength(10)
                    ->placeholder('مثال: 🥛'),
            ]),

            Select::make('source_type')
                ->label('نوع مصدر المنتجات')
                ->options([
                    'category'    => 'قسم / تصنيف من المتجر',
                    'tag'         => 'وسم (Tag)',
                    'bestsellers' => 'الأكثر مبيعاً',
                    'featured'    => 'المنتجات المميزة',
                    'on_sale'     => '🔥 عروض وخصومات',
                    'brand'       => '🏷️ براند معين',
                ])
                ->default('category')
                ->required()
                ->live(),

            Select::make('source_ids')
                ->label(fn ($get) => $get('source_type') === 'tag' ? 'اختر الوسوم (Tags)' : 'اختر القسم / التصنيفات (الرئيسية أو الفرعية)')
                ->multiple()
                ->searchable()
                ->preload()
                ->visible(fn ($get) => in_array($get('source_type'), ['category', 'tag'], true))
                ->dehydrated(fn ($get) => in_array($get('source_type'), ['category', 'tag'], true))
                ->options(fn ($get) => $get('source_type') === 'tag'
                    ? Tag::orderBy('name')->pluck('name', 'id')->toArray()
                    : Category::with('parent')
                        ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END ASC')
                        ->orderBy('sort_order')
                        ->orderBy('name')
                        ->get()
                        ->mapWithKeys(fn (Category $c) => [
                            $c->id => $c->parent ? "↳ {$c->name} ({$c->parent->name})" : "📁 {$c->name} (قسم رئيسي)",
                        ])
                        ->toArray()),

            Select::make('source_slugs')
                ->label('البراندات')
                ->multiple()
                ->searchable()
                ->preload()
                ->visible(fn ($get) => $get('source_type') === 'brand')
                ->dehydrated(fn ($get) => $get('source_type') === 'brand')
                ->options(fn () => BrandSetting::orderBy('name')->pluck('name', 'slug')->toArray()),

            Select::make('product_ids')
                ->label('منتجات محددة يدوياً (اختياري)')
                ->helperText('اتركه فارغاً لعرض منتجات المصدر تلقائياً')
                ->multiple()
                ->searchable()
                ->visible(fn ($get) => in_array($get('source_type'), ['category', 'tag']))
                ->getSearchResultsUsing(fn (string $search) => Product::query()
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->limit(30)
                    ->pluck('name', 'id')
                    ->toArray())
                ->getOptionLabelsUsing(fn (array $values) => Product::query()
                    ->whereIn('id', $values)
                    ->pluck('name', 'id')
                    ->toArray()),

            Grid::make(2)->schema([
                TextInput::make('sort_order')
                    ->label('ترتيب القسم')
                    ->numeric()
                    ->default(0),
                TextInput::make('products_limit')
                    ->label('أقصى عدد منتجات')
                    ->numeric()
                    ->default(10)
                    ->minValue(4)
                    ->maxValue(30),
                Select::make('sort_by')
                    ->label('ترتيب المنتجات داخل القسم')
                    ->options([
                        'default'    => 'الافتراضي (الأكثر مبيعاً)',
                        'newest'     => 'الأحدث أولاً',
                        'price_asc'  => 'الأقل سعراً أولاً',
                        'price_desc' => 'الأعلى سعراً أولاً',
                    ])
                    ->default('default')
                    ->required(),
                Toggle::make('visible')
                    ->label('مرئي في المتجر والتطبيق')
                    ->default(true),
            ]),

            Section::make('بنرات القسم (للتطبيق والموقع)')
                ->collapsed()
                ->schema([
                    Repeater::make('banners')
                        ->relationship()
                        ->label('')
                        ->addActionLabel('+ إضافة بنر للقسم')
                        ->orderColumn('sort_order')
                        ->defaultItems(0)
                        ->collapsible()
                        ->schema([
                            Grid::make(3)->schema([
                                Select::make('platform')
                                    ->label('منصة العرض')
                                    ->options([
                                        'both' => 'التطبيق والموقع معاً',
                                        'app'  => 'تطبيق الجوال فقط',
                                        'web'  => 'الموقع الإلكتروني فقط',
                                    ])
                                    ->default('both')
                                    ->required(),

                                FileUpload::make('image_path')
                                    ->label('ارفع صورة البنر')
                                    ->image()
                                    ->disk('public')
                                    ->directory('home-section-banners')
                                    ->maxSize(2048),

                                TextInput::make('external_url')
                                    ->label('أو رابط صورة خارجي')
                                    ->url()
                                    ->placeholder('https://...'),
                            ]),

                            Grid::make(2)->schema([
                                Select::make('link_type')
                                    ->label('نوع الرابط')
                                    ->options([
                                        'none'     => 'بدون رابط',
                                        'category' => 'قسم / تصنيف',
                                        'brand'    => 'براند',
                                        'tag'      => 'وسم (Tag)',
                                        'search'   => 'بحث عن كلمة',
                                    ])
                                    ->default('none')
                                    ->live()
                                    ->required(),

                                TextInput::make('link_value')
                                    ->label('قيمة الرابط (رقم القسم / الوسم / Slug البراند / كلمة البحث)')
                                    ->visible(fn ($get) => $get('link_type') !== 'none'),
                            ]),
                        ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sort_order')->label('#')->sortable()->width(50),
                TextColumn::make('icon')->label('')->width(40),
                TextColumn::make('title')->label('القسم')->searchable()->weight('bold'),
                TextColumn::make('source_type')
                    ->label('المصدر')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'category'    => 'تصنيف',
                        'tag'         => 'وسم',
                        'bestsellers' => 'الأكثر مبيعاً',
                        'featured'    => 'مميزة',
                        'on_sale'     => 'عروض',
                        'brand'       => 'براند',
                        default       => $state,
                    })
                    ->badge(),
                TextColumn::make('products_limit')->label('الحد')->suffix(' منتج'),
                IconColumn::make('visible')->label('مرئي')->boolean(),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->actions([
                EditAction::make()->label('تعديل'),
                DeleteAction::make()->label('حذف'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListHomeSections::route('/'),
            'create' => Pages\CreateHomeSection::route('/create'),
            'edit'   => Pages\EditHomeSection::route('/{record}/edit'),
        ];
    }
}
