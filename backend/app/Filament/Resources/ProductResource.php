<?php

namespace App\Filament\Resources;

use App\Filament\Exports\ProductExporter;
use App\Filament\Resources\ProductResource\Pages;
use App\Filament\Resources\ProductResource\Widgets\ProductStats;
use App\Models\Category;
use App\Models\Product;
use Filament\Actions\ActionGroup;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Actions\ExportBulkAction;
use Filament\Actions\ReplicateAction;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\ToggleButtons;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Group;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\QueryBuilder;
use Filament\Tables\Filters\QueryBuilder\Constraints\BooleanConstraint;
use Filament\Tables\Filters\QueryBuilder\Constraints\DateConstraint;
use Filament\Tables\Filters\QueryBuilder\Constraints\NumberConstraint;
use Filament\Tables\Filters\QueryBuilder\Constraints\TextConstraint;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\HtmlString;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string                 $recordTitleAttribute = 'name';
    protected static string|\BackedEnum|null $navigationIcon       = 'heroicon-o-bolt';
    protected static ?string                 $navigationLabel      = 'المنتجات';
    protected static \UnitEnum|string|null   $navigationGroup      = 'كتالوج المتجر';
    protected static ?int                    $navigationSort       = 1;
    protected static ?string                 $modelLabel           = 'منتج';
    protected static ?string                 $pluralModelLabel     = 'المنتجات';

    public static function getNavigationBadge(): ?string
    {
        return (string) \Illuminate\Support\Facades\Cache::remember(
            'nav_badge_products_count',
            60,
            fn () => static::getModel()::count(),
        );
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['brand', 'categories']);
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'name_en', 'sku', 'barcode', 'brand.name'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Product $record */
        $details = [];
        if ($record->brand) {
            $details['البراند'] = $record->brand->name;
        }
        $details['السعر'] = "{$record->price} ر.س";
        $details['المخزون'] = $record->stock_status === 'instock' ? 'متوفر' : 'نفد';

        return $details;
    }

    public static function form(Schema $form): Schema
    {
        return $form->components([
            Grid::make(3)
                ->columnSpanFull()
                ->schema([
                    // ══════════════════════════════════════════════════════════
                    // العمود الرئيسي (2/3) — مطابق لتصميم Filament Shop الرسمي
                    // ══════════════════════════════════════════════════════════
                    Group::make()
                        ->columnSpan(['lg' => 2])
                        ->schema([
                            // ── 1. تفاصيل المنتج الأساسية والوصف ──────────────
                            Section::make()
                                ->schema([
                                    Grid::make(2)->schema([
                                        TextInput::make('name')
                                            ->label('اسم المنتج')
                                            ->required()
                                            ->maxLength(500)
                                            ->live(onBlur: true)
                                            ->afterStateUpdated(function (string $operation, $state, callable $set, callable $get) {
                                                if ($operation === 'create' && blank($get('slug')) && filled($state)) {
                                                    $set('slug', Product::uniqueSlug((string) $state));
                                                }
                                            })
                                            ->placeholder('مثال: كرتون مياه نوفا 330 مل × 40 عبوة'),

                                        TextInput::make('slug')
                                            ->label('الرابط الدائم (Slug)')
                                            ->maxLength(500)
                                            ->unique(Product::class, 'slug', ignoreRecord: true)
                                            ->placeholder('يُولَّد تلقائياً عند كتابة الاسم'),
                                    ]),

                                    TextInput::make('name_en')
                                        ->label('اسم المنتج بالإنجليزية (اختياري)')
                                        ->maxLength(500)
                                        ->placeholder('Example: Nova Water 330ml x 40'),

                                    RichEditor::make('description')
                                        ->label('الوصف التفصيلي (Description)')
                                        ->columnSpanFull(),

                                    Textarea::make('short_description')
                                        ->label('وصف مختصر يظهر أعلى السلة (اختياري)')
                                        ->rows(2)
                                        ->columnSpanFull(),

                                    Section::make('الترجمة الإنجليزية للوصف (اختياري)')
                                        ->collapsed()
                                        ->compact()
                                        ->schema([
                                            Textarea::make('short_description_en')
                                                ->label('الوصف المختصر (English)')
                                                ->rows(2),
                                            RichEditor::make('description_en')
                                                ->label('الوصف التفصيلي (English)'),
                                        ]),
                                ]),

                            // ── 2. الصور والوسائط (مع محرر وقص الصور المدمج + روابط الصور المستوردة) ──
                            Section::make('الصور (الرئيسية والفرعية)')
                                ->collapsible()
                                ->schema([
                                    FileUpload::make('images')
                                        ->label('رفع صور من الجهاز (الصورة الأولى رئيسية والبقية فرعية لمعرض المنتج)')
                                        ->image()
                                        ->imageEditor()
                                        ->imageEditorAspectRatios([
                                            null,
                                            '1:1',
                                            '4:3',
                                            '16:9',
                                        ])
                                        ->multiple()
                                        ->reorderable()
                                        ->appendFiles()
                                        ->openable()
                                        ->downloadable()
                                        ->disk('public')
                                        ->directory('products')
                                        ->maxFiles(20)
                                        ->maxSize(10240)
                                        ->panelLayout('grid')
                                        ->helperText('اسحب الصور لترتيبها · اضغط أيقونة القلم لقص وتعديل الصورة مباشرة'),

                                    Section::make('روابط الصور الخارجية / المستوردة من Excel (الرئيسية والفرعية)')
                                        ->collapsible()
                                        ->collapsed(fn (?Product $record): bool => empty(array_filter(
                                            is_array($record?->images) ? $record->images : [],
                                            fn ($img) => is_string($img) && (str_starts_with($img, 'http://') || str_starts_with($img, 'https://'))
                                        )))
                                        ->compact()
                                        ->schema([
                                            Repeater::make('external_image_urls')
                                                ->hiddenLabel()
                                                ->addActionLabel('+ إضافة رابط صورة خارجية (رئيسية أو فرعية)')
                                                ->reorderable()
                                                ->defaultItems(0)
                                                ->columns(4)
                                                ->schema([
                                                    Placeholder::make('preview')
                                                        ->hiddenLabel()
                                                        ->content(function (callable $get): HtmlString {
                                                            $url = trim((string) ($get('url') ?? ''));
                                                            if ($url === '' || (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://'))) {
                                                                return new HtmlString('<div style="width:48px;height:48px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8;">معاينة</div>');
                                                            }
                                                            $safe = e($url);
                                                            return new HtmlString('<img src="' . $safe . '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid rgba(148,163,184,.3);" />');
                                                        }),

                                                    TextInput::make('url')
                                                        ->label('رابط الصورة (URL)')
                                                        ->url()
                                                        ->live(onBlur: true)
                                                        ->placeholder('https://...')
                                                        ->columnSpan(3),
                                                ]),
                                        ]),
                                ]),

                            // ── 3. التسعير (Pricing) ──────────────────────────
                            Section::make('التسعير (Pricing)')
                                ->collapsible()
                                ->schema([
                                    Grid::make(2)->schema([
                                        TextInput::make('regular_price')
                                            ->label('السعر الأساسي (Price)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required()
                                            ->default(0)
                                            ->suffix('ر.س'),

                                        TextInput::make('sale_price')
                                            ->label('سعر الخصم / العرض (Sale price)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->suffix('ر.س')
                                            ->helperText('اتركه فارغاً إذا لم يكن هناك خصم'),

                                        TextInput::make('cost_price')
                                            ->label('سعر التكلفة للوحدة (Cost per item)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->suffix('ر.س')
                                            ->helperText('العملاء لن يروا سعر التكلفة هذا.'),

                                        Grid::make(2)->schema([
                                            TextInput::make('unit')
                                                ->label('الوحدة')
                                                ->maxLength(50)
                                                ->placeholder('حبة / كرتون / كجم'),

                                            TextInput::make('bundle_qty')
                                                ->label('كمية عرض الحزمة')
                                                ->numeric()
                                                ->minValue(2)
                                                ->placeholder('مثال: 4'),
                                        ]),
                                    ]),
                                ]),

                            // ── 4. المخزون والباركود (Inventory) ──────────────
                            Section::make('المخزون والباركود (Inventory)')
                                ->collapsible()
                                ->schema([
                                    Grid::make(2)->schema([
                                        TextInput::make('sku')
                                            ->label('SKU (رمز المنتج التخزيني)')
                                            ->unique(Product::class, 'sku', ignoreRecord: true)
                                            ->maxLength(100)
                                            ->placeholder('مثال: ECO-10025'),

                                        TextInput::make('barcode')
                                            ->label('الباركود (ISBN, UPC, GTIN, EAN)')
                                            ->maxLength(100)
                                            ->placeholder('مثال: 6281006420120'),

                                        TextInput::make('stock_quantity')
                                            ->label('الكمية المتوفرة (Quantity)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->default(0),

                                        TextInput::make('security_stock')
                                            ->label('مخزون الأمان (Security stock)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->default(5)
                                            ->helperText('حد التنبيه عندما توشك كمية هذا المنتج على النفاد.'),
                                    ]),

                                    Grid::make(3)->schema([
                                        Toggle::make('manage_stock')
                                            ->label('تتبع الكمية تلقائياً')
                                            ->default(true),

                                        Toggle::make('backorder')
                                            ->label('السماح بالطلب عند النفاد')
                                            ->default(false),

                                        Select::make('stock_status')
                                            ->label('حالة المخزون')
                                            ->options([
                                                'instock'    => '🟢 متوفر بالمخزون',
                                                'outofstock' => '🔴 نفدت الكمية',
                                            ])
                                            ->default('instock')
                                            ->required(),
                                    ]),
                                ]),

                            // ── 5. الشحن والأبعاد (Shipping) ──────────────────
                            Section::make('الشحن والأبعاد (Shipping)')
                                ->collapsible()
                                ->collapsed()
                                ->schema([
                                    Checkbox::make('requires_shipping')
                                        ->label('هذا المنتج يُشحن ويوصل للعميل')
                                        ->default(true)
                                        ->live(),

                                    Grid::make(4)
                                        ->visible(fn ($get) => (bool) $get('requires_shipping'))
                                        ->schema([
                                            TextInput::make('weight_value')
                                                ->label('الوزن')
                                                ->numeric()
                                                ->minValue(0)
                                                ->suffix('كجم'),

                                            TextInput::make('height_value')
                                                ->label('الارتفاع')
                                                ->numeric()
                                                ->minValue(0)
                                                ->suffix('سم'),

                                            TextInput::make('width_value')
                                                ->label('العرض')
                                                ->numeric()
                                                ->minValue(0)
                                                ->suffix('سم'),

                                            TextInput::make('depth_value')
                                                ->label('الطول / العمق')
                                                ->numeric()
                                                ->minValue(0)
                                                ->suffix('سم'),
                                        ]),
                                ]),

                            // ── 6. التنويعات للمنتج متعدد الخيارات ─────────────
                            Section::make('التنويعات (Variations — المقاسات / الأحجام / الألوان)')
                                ->collapsible()
                                ->visible(fn ($get) => $get('type') === 'variable')
                                ->schema([
                                    Repeater::make('variations')
                                        ->relationship()
                                        ->hiddenLabel()
                                        ->addActionLabel('+ إضافة تنويعة جديدة')
                                        ->orderColumn('sort_order')
                                        ->collapsible()
                                        ->defaultItems(0)
                                        ->schema([
                                            Grid::make(4)->schema([
                                                TextInput::make('sku')
                                                    ->label('SKU التنويعة')
                                                    ->maxLength(100),

                                                TextInput::make('regular_price')
                                                    ->label('السعر الأساسي (ر.س)')
                                                    ->numeric()
                                                    ->required()
                                                    ->default(0),

                                                TextInput::make('sale_price')
                                                    ->label('سعر الخصم (ر.س)')
                                                    ->numeric(),

                                                Select::make('stock_status')
                                                    ->label('التوفر')
                                                    ->options([
                                                        'instock'    => 'متوفر',
                                                        'outofstock' => 'نفد',
                                                    ])
                                                    ->default('instock')
                                                    ->required(),
                                            ]),

                                            Grid::make(2)->schema([
                                                TextInput::make('stock_quantity')
                                                    ->label('الكمية المتوفرة')
                                                    ->numeric(),

                                                FileUpload::make('image_path')
                                                    ->label('صورة التنويعة')
                                                    ->image()
                                                    ->imageEditor()
                                                    ->disk('public')
                                                    ->directory('product-variations')
                                                    ->maxSize(2048),
                                            ]),

                                            Repeater::make('attributes')
                                                ->label('خصائص هذه التنويعة')
                                                ->addActionLabel('+ إضافة خاصية')
                                                ->defaultItems(1)
                                                ->columns(2)
                                                ->schema([
                                                    TextInput::make('attribute')
                                                        ->label('الخاصية (مثال: الحجم)')
                                                        ->required(),
                                                    TextInput::make('value')
                                                        ->label('القيمة (مثال: 1 لتر)')
                                                        ->required(),
                                                ]),
                                        ]),
                                ]),
                        ]),

                    // ══════════════════════════════════════════════════════════
                    // العمود الجانبي (1/3) — الحالة والظهور والارتباطات
                    // ══════════════════════════════════════════════════════════
                    Group::make()
                        ->columnSpan(['lg' => 1])
                        ->schema([
                            // ── بطاقة الحالة والظهور (Status) ─────────────────
                            Section::make('الحالة والظهور (Status)')
                                ->schema([
                                    ToggleButtons::make('status')
                                        ->label('حالة النشر')
                                        ->inline()
                                        ->options([
                                            'publish' => 'منشور',
                                            'draft'   => 'مسودة',
                                            'private' => 'مخفي',
                                        ])
                                        ->icons([
                                            'publish' => 'heroicon-o-check-circle',
                                            'draft'   => 'heroicon-o-pencil-square',
                                            'private' => 'heroicon-o-eye-slash',
                                        ])
                                        ->colors([
                                            'publish' => 'success',
                                            'draft'   => 'warning',
                                            'private' => 'gray',
                                        ])
                                        ->default('publish')
                                        ->required(),

                                    Toggle::make('featured')
                                        ->label('منتج مميز ⭐')
                                        ->helperText('تفعيل ظهور المنتج ضمن المنتجات المميزة.')
                                        ->default(false),

                                    DatePicker::make('published_at')
                                        ->label('تاريخ الإتاحة (Availability)')
                                        ->default(now())
                                        ->required(),

                                    ToggleButtons::make('type')
                                        ->label('نوع المنتج')
                                        ->grouped()
                                        ->options([
                                            'simple'   => 'بسيط',
                                            'variable' => 'متعدد الخيارات',
                                        ])
                                        ->icons([
                                            'simple'   => 'heroicon-o-cube',
                                            'variable' => 'heroicon-o-squares-plus',
                                        ])
                                        ->default('simple')
                                        ->required()
                                        ->live(),

                                    Grid::make(2)->schema([
                                        TextInput::make('sort_order')
                                            ->label('ترتيب العرض')
                                            ->numeric()
                                            ->default(0),

                                        TextInput::make('total_sales')
                                            ->label('المبيعات')
                                            ->numeric()
                                            ->minValue(0)
                                            ->default(0),
                                    ]),
                                ]),

                            // ── بطاقة الارتباطات (Associations) ───────────────
                            Section::make('الارتباطات (Associations)')
                                ->schema([
                                    Select::make('brand_setting_id')
                                        ->label('البراند (Brand)')
                                        ->relationship('brand', 'name')
                                        ->searchable()
                                        ->preload()
                                        ->placeholder('اختر البراند')
                                        ->createOptionForm([
                                            TextInput::make('name')->label('اسم البراند (عربي)')->required(),
                                            TextInput::make('name_en')->label('اسم البراند (إنجليزي)'),
                                            FileUpload::make('image_path')
                                                ->label('شعار البراند')
                                                ->image()
                                                ->disk('public')
                                                ->directory('brands'),
                                            Toggle::make('is_active')->label('مفعّل')->default(true),
                                        ]),

                                    Select::make('categories')
                                        ->label('الأقسام (Categories)')
                                        ->relationship('categories', 'name')
                                        ->multiple()
                                        ->searchable()
                                        ->preload()
                                        ->required()
                                        ->createOptionForm([
                                            TextInput::make('name')->label('اسم القسم (عربي)')->required(),
                                            TextInput::make('name_en')->label('اسم القسم (إنجليزي)'),
                                            Select::make('parent_id')
                                                ->label('القسم الأب')
                                                ->options(fn () => Category::orderBy('name')->pluck('name', 'id')->toArray()),
                                            FileUpload::make('image_path')
                                                ->label('صورة القسم')
                                                ->image()
                                                ->disk('public')
                                                ->directory('categories'),
                                        ]),

                                    Select::make('tags')
                                        ->label('الوسوم (Tags)')
                                        ->relationship('tags', 'name')
                                        ->multiple()
                                        ->searchable()
                                        ->preload()
                                        ->createOptionForm([
                                            TextInput::make('name')->label('اسم الوسم (عربي)')->required(),
                                            TextInput::make('name_en')->label('اسم الوسم (إنجليزي)'),
                                        ]),

                                    Select::make('related_product_ids')
                                        ->label('منتجات ذات صلة (اختياري)')
                                        ->multiple()
                                        ->searchable()
                                        ->helperText('اتركه فارغاً ليقترح المتجر تلقائياً من نفس القسم')
                                        ->getSearchResultsUsing(fn (string $search, ?Product $record) => Product::query()
                                            ->when($record?->exists, fn ($q) => $q->where('id', '!=', $record->id))
                                            ->where(fn ($q) => $q
                                                ->where('name', 'like', "%{$search}%")
                                                ->orWhere('sku', 'like', "%{$search}%"))
                                            ->limit(30)
                                            ->pluck('name', 'id')
                                            ->toArray())
                                        ->getOptionLabelsUsing(fn (array $values) => Product::query()
                                            ->whereIn('id', $values)
                                            ->pluck('name', 'id')
                                            ->toArray()),
                                ]),
                        ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('primary_image_url')
                    ->label('الصورة')
                    ->square()
                    ->height(48)
                    ->width(48),

                TextColumn::make('name')
                    ->label('المنتج')
                    ->description(fn (Product $r) => implode(' · ', array_filter([
                        $r->sku ? "SKU: {$r->sku}" : null,
                        $r->barcode ?: null,
                        $r->unit ?: null,
                    ])))
                    ->searchable(['name', 'name_en', 'sku', 'barcode'])
                    ->sortable()
                    ->limit(45)
                    ->weight('bold'),

                TextColumn::make('brand.name')
                    ->label('البراند')
                    ->searchable()
                    ->sortable()
                    ->placeholder('—')
                    ->toggleable(),

                IconColumn::make('status')
                    ->label('الظهور')
                    ->icon(fn (string $state): string => match ($state) {
                        'publish' => 'heroicon-o-check-circle',
                        'draft'   => 'heroicon-o-pencil-square',
                        default   => 'heroicon-o-eye-slash',
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'publish' => 'success',
                        'draft'   => 'warning',
                        default   => 'gray',
                    })
                    ->sortable(),

                TextColumn::make('price')
                    ->label('السعر')
                    ->formatStateUsing(fn ($state, Product $r) => $r->on_sale
                        ? "{$r->price} ر.س (بدل {$r->regular_price})"
                        : "{$r->price} ر.س")
                    ->badge()
                    ->color(fn (Product $r) => $r->on_sale ? 'success' : 'gray')
                    ->sortable(),

                TextColumn::make('sku')
                    ->label('SKU')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('stock_quantity')
                    ->label('الكمية')
                    ->formatStateUsing(fn ($state, Product $r) => $r->stock_status === 'outofstock'
                        ? 'نفد (0)'
                        : ($r->manage_stock && $state !== null ? (string) $state : 'متوفر'))
                    ->badge()
                    ->color(fn (Product $r) => $r->stock_status === 'outofstock'
                        ? 'danger'
                        : ($r->manage_stock && $r->stock_quantity !== null && $r->stock_quantity <= ($r->security_stock ?? 5) ? 'warning' : 'success'))
                    ->sortable(),

                TextColumn::make('security_stock')
                    ->label('مخزون الأمان')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('categories.name')
                    ->label('الأقسام')
                    ->badge()
                    ->color('info')
                    ->limitList(2)
                    ->toggleable(),

                ToggleColumn::make('featured')
                    ->label('مميز')
                    ->toggleable(),

                TextColumn::make('published_at')
                    ->label('تاريخ النشر')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                QueryBuilder::make()
                    ->constraints([
                        TextConstraint::make('name')->label('اسم المنتج'),
                        TextConstraint::make('sku')->label('SKU'),
                        TextConstraint::make('barcode')->label('الباركود'),
                        NumberConstraint::make('price')->label('السعر'),
                        NumberConstraint::make('stock_quantity')->label('الكمية'),
                        BooleanConstraint::make('featured')->label('مميز'),
                        BooleanConstraint::make('on_sale')->label('عليه خصم'),
                        DateConstraint::make('published_at')->label('تاريخ النشر'),
                    ]),
                SelectFilter::make('categories')
                    ->label('القسم')
                    ->relationship('categories', 'name')
                    ->searchable(),
                SelectFilter::make('brand_setting_id')
                    ->label('البراند')
                    ->relationship('brand', 'name')
                    ->searchable(),
                TernaryFilter::make('on_sale')
                    ->label('العروض والخصومات'),
            ])
            ->defaultSort('id', 'desc')
            ->actions([
                EditAction::make()->label('تعديل'),
                ActionGroup::make([
                    ReplicateAction::make()
                        ->label('تكرار المنتج')
                        ->excludeAttributes(['slug', 'sku', 'barcode', 'woo_product_id', 'total_sales'])
                        ->beforeReplicaSaved(function (Product $replica): void {
                            $replica->name = $replica->name . ' (نسخة)';
                            $replica->status = 'draft';
                        })
                        ->successNotification(
                            Notification::make()
                                ->success()
                                ->title('تم نسخ المنتج كمسودة بنجاح')
                        ),
                    DeleteAction::make()
                        ->label('حذف')
                        ->after(fn () => Pages\ListProducts::clearProductStatsCache()),
                ]),
            ])
            ->groupedBulkActions([
                BulkAction::make('mark_instock')
                    ->label('تحويل إلى متوفر')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->action(function (Collection $records): void {
                        Product::whereIn('id', $records->pluck('id')->all())->update(['stock_status' => 'instock']);
                        Pages\ListProducts::clearProductStatsCache();
                    }),

                BulkAction::make('mark_outofstock')
                    ->label('تحويل إلى نفدت الكمية')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->action(function (Collection $records): void {
                        Product::whereIn('id', $records->pluck('id')->all())->update(['stock_status' => 'outofstock']);
                        Pages\ListProducts::clearProductStatsCache();
                    }),

                BulkAction::make('publish_selected')
                    ->label('نشر المحدد')
                    ->icon('heroicon-o-eye')
                    ->action(function (Collection $records): void {
                        Product::whereIn('id', $records->pluck('id')->all())->update(['status' => 'publish']);
                        Pages\ListProducts::clearProductStatsCache();
                    }),

                ExportBulkAction::make()
                    ->label('تصدير المحدد (Excel / CSV)')
                    ->exporter(ProductExporter::class),

                DeleteBulkAction::make()
                    ->label('حذف المحدد')
                    ->action(function (Collection $records): void {
                        $ids = $records->pluck('id')->all();
                        if (!empty($ids)) {
                            \Illuminate\Support\Facades\DB::table('product_category')->whereIn('product_id', $ids)->delete();
                            \Illuminate\Support\Facades\DB::table('product_tag')->whereIn('product_id', $ids)->delete();
                            Product::whereIn('id', $ids)->delete();
                            Pages\ListProducts::clearProductStatsCache();
                        }
                    }),
            ]);
    }

    public static function getWidgets(): array
    {
        return [
            ProductStats::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit'   => Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}
