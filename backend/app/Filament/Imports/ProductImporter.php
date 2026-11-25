<?php

namespace App\Filament\Imports;

use App\Models\BrandSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\Tag;
use Filament\Actions\Imports\ImportColumn;
use Filament\Actions\Imports\Importer;
use Filament\Actions\Imports\Models\Import;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Fieldset;

class ProductImporter extends Importer
{
    protected static ?string $model = Product::class;

    /**
     * Common grocery / Ninja slug prefixes mapped to clean Arabic root department names.
     *
     * @var array<string, string>
     */
    private const SLUG_PREFIX_DEPARTMENTS = [
        'cheese'        => 'الأجبان',
        'dairy'         => 'الألبان والحليب',
        'milk'          => 'الألبان والحليب',
        'bakery'        => 'المخبوزات',
        'bread'         => 'المخبوزات',
        'meat'          => 'اللحوم والدواجن',
        'poultry'       => 'اللحوم والدواجن',
        'seafood'       => 'الأسماك والمأكولات البحرية',
        'fruit'         => 'الخضار والفواكه',
        'fruits'        => 'الخضار والفواكه',
        'vegetable'     => 'الخضار والفواكه',
        'vegetables'    => 'الخضار والفواكه',
        'produce'       => 'الخضار والفواكه',
        'beverage'      => 'المشروبات والعصائر',
        'beverages'     => 'المشروبات والعصائر',
        'drinks'        => 'المشروبات والعصائر',
        'juice'         => 'المشروبات والعصائر',
        'water'         => 'المياه والمشروبات',
        'snack'         => 'السناكات والحلويات',
        'snacks'         => 'السناكات والحلويات',
        'sweets'        => 'السناكات والحلويات',
        'chocolate'     => 'الشوكولاتة والحلويات',
        'frozen'        => 'المجمدات',
        'ice-cream'     => 'الآيس كريم',
        'icecream'      => 'الآيس كريم',
        'coffee'        => 'القهوة والشاي',
        'tea'           => 'القهوة والشاي',
        'breakfast'     => 'الفطور والحبوب',
        'grocery'       => 'البقالة والمعلبات',
        'pantry'        => 'البقالة والمعلبات',
        'cleaning'      => 'المنظفات والعناية بالمنزل',
        'household'     => 'المنظفات والعناية بالمنزل',
        'personal-care' => 'العناية الشخصية',
        'beauty'        => 'العناية والجمال',
        'baby'          => 'مستلزمات الأطفال',
        'pet'           => 'مستلزمات الحيوانات',
    ];

    /**
     * Known uppercase supplier brand codes mapped to clean Arabic & English brand names.
     *
     * @var array<string, array{name: string, name_en: string}>
     */
    private const BRAND_CODE_MAP = [
        'ALMARAI'            => ['name' => 'المراعي',          'name_en' => 'Almarai'],
        'PUCK'               => ['name' => 'بوك',              'name_en' => 'Puck'],
        'PRESIDENT'          => ['name' => 'بريزيدن',          'name_en' => 'President'],
        'KRAFT'              => ['name' => 'كرافت',            'name_en' => 'Kraft'],
        'KIRI'               => ['name' => 'كيري',             'name_en' => 'Kiri'],
        'KIRI-SWEET-BITES'   => ['name' => 'كيري سويت بايتس',  'name_en' => 'Kiri Sweet Bites'],
        'KIRI-PROTEIN'       => ['name' => 'كيري بروتين',      'name_en' => 'Kiri Protein'],
        'PHILADELPHIA'       => ['name' => 'فيلادلفيا',        'name_en' => 'Philadelphia'],
        'NADEC'              => ['name' => 'نادك',             'name_en' => 'Nadec'],
        'ALSAFI'             => ['name' => 'الصافي',           'name_en' => 'Alsafi'],
        'BALADE'             => ['name' => 'بلدي',             'name_en' => 'Balade'],
        'DARI'               => ['name' => 'داري',             'name_en' => 'Dari'],
        'PRIDE'              => ['name' => 'برايد',            'name_en' => 'Pride'],
        'JOBN-ZITOON'        => ['name' => 'جبن وزيتون',       'name_en' => 'Jobn & Zitoon'],
        'THE-THREE-COWS'     => ['name' => 'البقرات الثلاث',   'name_en' => 'The Three Cows'],
        'KHALWBOHAR'         => ['name' => 'خل وبهار',         'name_en' => 'Khal W Bohar'],
        'SHAHAD'             => ['name' => 'شهد',              'name_en' => 'Shahad'],
        'DOMTY'              => ['name' => 'دومتي',            'name_en' => 'Domty'],
        'INALPI'             => ['name' => 'إنالبي',           'name_en' => 'Inalpi'],
        'MILKY-LUX'          => ['name' => 'ميلكي لوكس',       'name_en' => 'Milky Lux'],
        'TAYBAH'             => ['name' => 'طيبة',             'name_en' => 'Taybah'],
        'LUNA'               => ['name' => 'لونا',             'name_en' => 'Luna'],
        'NADA'               => ['name' => 'ندى',              'name_en' => 'Nada'],
        'OLYANA-ELITE'       => ['name' => 'أوليانا إيليت',    'name_en' => 'Olyana Elite'],
        'ULKER'              => ['name' => 'أولكر',            'name_en' => 'Ulker'],
        'PINAR'              => ['name' => 'بينار',            'name_en' => 'Pinar'],
        'ABU-AL-WALAD'       => ['name' => 'أبو الولد',        'name_en' => 'Abu Al Walad'],
        'VICTORIA'           => ['name' => 'فكتوريا',          'name_en' => 'Victoria'],
        'NATURELAND'         => ['name' => 'أرض الطبيعة',      'name_en' => 'Natureland'],
        'MINI-BABYBEL'       => ['name' => 'ميني بيبي بيل',    'name_en' => 'Mini Babybel'],
        'LA-VACHE-QUI-RIT'   => ['name' => 'البقرة الضاحكة',   'name_en' => 'La Vache Qui Rit'],
        'MURATBEY'           => ['name' => 'مرادبي',           'name_en' => 'Muratbey'],
        'VALBRESO'           => ['name' => 'فالبريسو',         'name_en' => 'Valbreso'],
        'AFRAN-ELHATAB'      => ['name' => 'أفران الحطب',      'name_en' => 'Afran Elhatab'],
        'LAYAN-DELIGHT'      => ['name' => 'ليان ديلايت',      'name_en' => 'Layan Delight'],
        'ZANETTI'            => ['name' => 'زانيتي',           'name_en' => 'Zanetti'],
        'ZUGER'              => ['name' => 'زوغر',             'name_en' => 'Zuger'],
        'GRAN-MORAVIA'       => ['name' => 'غران مورافيا',     'name_en' => 'Gran Moravia'],
        'ANCHOR'             => ['name' => 'أنكور',            'name_en' => 'Anchor'],
        'KASEREI-CHAMPIGNON' => ['name' => 'تشامبينيون',       'name_en' => 'Kaserei Champignon'],
        'LADANAH'            => ['name' => 'لدانة',            'name_en' => 'Ladanah'],
        'GLENSTAL'           => ['name' => 'غلينستال',         'name_en' => 'Glenstal'],
        'VITNEL'             => ['name' => 'فيتنيل',           'name_en' => 'Vitnel'],
        'TOJAN'              => ['name' => 'توجان',            'name_en' => 'Tojan'],
        'THE-KINGS-DAIRY'    => ['name' => 'ذا كينغز ديري',    'name_en' => 'The Kings Dairy'],
        'DAMAS'              => ['name' => 'داماس',            'name_en' => 'Damas'],
        'DANA-BLUE'          => ['name' => 'دانا بلو',         'name_en' => 'Dana Blue'],
        'ILE-DE-FRANCE'      => ['name' => 'إيل دو فرانس',     'name_en' => 'Ile De France'],
        'FOODYS'             => ['name' => 'فوديز',            'name_en' => 'Foodys'],
        'ELITE-PRODUCTS'     => ['name' => 'إيليت',            'name_en' => 'Elite Products'],
        'GROZETTE'           => ['name' => 'غروزيت',           'name_en' => 'Grozette'],
        'GHANEYAH'           => ['name' => 'غنية',             'name_en' => 'Ghaneyah'],
    ];

    /**
     * Tracks product IDs already synced in the current process/chunk so multi-sheet files
     * merge extra categories (e.g. "افضل العروض") without detaching categories from Sheet 1.
     *
     * @var array<int, bool>
     */
    private static array $touchedProductIds = [];

    /**
     * Detects a suggested main root category name from the uploaded filename or category slugs.
     *
     * @param  array<int, array<string, mixed>>  $sampleRows
     */
    public static function detectMainCategoryName(?string $fileName, array $sampleRows = []): ?string
    {
        // 1. Inspect category slugs in sample rows (e.g. "cheese-cheese-block" -> "cheese" -> "الأجبان")
        $prefixCounts = [];
        foreach ($sampleRows as $row) {
            $slugRaw = (string) ($row['وسوم الأقسام (Slugs)'] ?? $row['category_slugs'] ?? $row['وسوم الأقسام'] ?? '');
            if ($slugRaw === '') {
                continue;
            }
            foreach (preg_split('/[,،|\s]+/u', strtolower($slugRaw)) as $slug) {
                $slug = trim($slug);
                if ($slug === '') {
                    continue;
                }
                foreach (self::SLUG_PREFIX_DEPARTMENTS as $prefix => $arabicDept) {
                    if ($slug === $prefix || str_starts_with($slug, $prefix . '-')) {
                        $prefixCounts[$arabicDept] = ($prefixCounts[$arabicDept] ?? 0) + 1;
                        break;
                    }
                }
            }
        }

        if (!empty($prefixCounts)) {
            arsort($prefixCounts);
            $topDept = array_key_first($prefixCounts);
            // If file name also contains a more specific Arabic title, prefer it unless slugs strongly agree
            if ($topDept !== null) {
                return $topDept;
            }
        }

        // 2. Fallback: extract clean Arabic department name from filename (e.g. "منتجات_الأجبان_نينجا.xlsx" -> "الأجبان")
        if ($fileName !== null && trim($fileName) !== '') {
            $base = pathinfo($fileName, PATHINFO_FILENAME);
            $cleaned = preg_replace('/[_\-\d()]+/u', ' ', $base);
            $stopWords = [
                'منتجات', 'منتج', 'نينجا', 'ملف', 'جدول', 'استيراد', 'تصدير', 'قائمة', 'قسم', 'أقسام', 'اقسام',
                'جميع', 'كل', 'بيانات', 'متجر', 'products', 'product', 'import', 'export', 'template', 'ninja',
                'sheet', 'csv', 'xlsx', 'data', 'copy', 'نسخة', 'من',
            ];
            $words = array_values(array_filter(
                preg_split('/\s+/u', trim((string) $cleaned)),
                fn (string $w) => $w !== '' && !in_array(mb_strtolower($w), $stopWords, true)
            ));

            if (!empty($words)) {
                $candidate = trim(implode(' ', $words));
                if (mb_strlen($candidate) >= 2 && mb_strlen($candidate) <= 60) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    public static function getOptionsFormComponents(): array
    {
        return [
            Fieldset::make('تنظيم الأقسام الرئيسية والفرعية تلقائياً')
                ->columns(2)
                ->schema([
                    Toggle::make('nest_under_parent')
                        ->label('ضم جميع الأقسام الفرعية في الملف تحت قسم رئيسي واحد تلقائياً')
                        ->default(true)
                        ->columnSpanFull(),

                    Select::make('parent_category_id')
                        ->label('اختيار قسم رئيسي موجود (اختياري)')
                        ->placeholder('— أو اتركه لإنشاء قسم رئيسي بالاسم أدناه —')
                        ->options(fn () => Category::query()
                            ->whereNull('parent_id')
                            ->orderBy('sort_order')
                            ->orderBy('name')
                            ->pluck('name', 'id')
                            ->all())
                        ->searchable()
                        ->preload(),

                    TextInput::make('parent_category_name')
                        ->label('اسم القسم الرئيسي لهذا الملف (ينشأ تلقائياً)')
                        ->placeholder('مثال: الأجبان — ستندرج جميع الأقسام الفرعية بالملف تحته')
                        ->helperText('يكتشف تلقائياً من اسم الملف أو وسوم الأقسام، ويمكنك تعديله بحرية قبل بدء الاستيراد.')
                        ->maxLength(255),
                ]),
        ];
    }

    /**
     * Parses Arabic/English boolean strings ("نعم", "لا", "1", "0", "yes", "no", "true", "false").
     */
    private static function parseBool(mixed $state, bool $default = false): bool
    {
        if (is_bool($state)) {
            return $state;
        }
        $val = mb_strtolower(trim((string) $state));
        if ($val === '') {
            return $default;
        }
        if (in_array($val, ['1', 'true', 'yes', 'y', 'نعم', 'صح', 'متوفر', 'مفعل', 'نشط', 'instock'], true)) {
            return true;
        }
        if (in_array($val, ['0', 'false', 'no', 'n', 'لا', 'خطأ', 'غير متوفر', 'نفد', 'outofstock'], true)) {
            return false;
        }

        return $default;
    }

    private static function parseNumber(mixed $state): ?float
    {
        if ($state === null || $state === '') {
            return null;
        }
        $clean = preg_replace('/[^\d.\-]/', '', str_replace(',', '', (string) $state));
        return ($clean !== '' && is_numeric($clean)) ? (float) $clean : null;
    }

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('name')
                ->label('اسم المنتج (عربي) — إلزامي')
                ->requiredMapping()
                ->guess(['اسم المنتج (عربي)', 'اسم المنتج', 'الاسم', 'name', 'Name'])
                ->rules(['required', 'max:500'])
                ->example('المراعي لبنة كامل الدسم 700 جم'),

            ImportColumn::make('name_en')
                ->label('اسم المنتج (إنجليزي)')
                ->guess(['اسم المنتج (إنجليزي)', 'الاسم الإنجليزي', 'name_en', 'English Name'])
                ->rules(['nullable', 'max:500'])
                ->example('Almarai Labneh Full Fat 700 gm'),

            ImportColumn::make('description')
                ->label('الوصف (عربي)')
                ->fillRecordUsing(function (Product $record, $state): void {
                    $clean = self::cleanDescription($state);
                    if ($clean !== null) {
                        $record->description = $clean;
                    }
                })
                ->guess([
                    'الوصف (عربي)',
                    'الوصف العربي',
                    'وصف المنتج',
                    'وصف المنتج (عربي)',
                    'الوصف الكامل (عربي)',
                    'الوصف الكامل',
                    'الوصف',
                    'التفاصيل',
                    'تفاصيل المنتج',
                    'description',
                    'Description',
                    'product_description',
                ])
                ->rules(['nullable'])
                ->example('لبنة المراعي الطازجة كاملة الدسم بقوام كريمي غني...'),

            ImportColumn::make('sku')
                ->label('رمز المنتج (SKU / Product ID)')
                ->guess(['رمز المنتج (SKU / Product ID)', 'رمز المنتج', 'الكود', 'sku', 'SKU'])
                ->castStateUsing(fn ($state) => $state !== null && trim((string) $state) !== '' ? trim((string) $state) : null)
                ->rules(['nullable', 'max:100'])
                ->example('1220'),

            ImportColumn::make('item_number')
                ->label('رقم الصنف (Number — احتياطي عند غياب SKU)')
                ->fillRecordUsing(fn () => null)
                ->guess(['رقم الصنف (Number)', 'رقم الصنف', 'item_number', 'Number'])
                ->example('138154'),

            ImportColumn::make('regular_price')
                ->label('السعر الأصلي (ريال) — إلزامي')
                ->requiredMapping()
                ->guess(['السعر الأصلي (ريال)', 'السعر الأساسي', 'السعر الأصلي', 'regular_price', 'Regular price', 'price', 'السعر'])
                ->castStateUsing(fn ($state) => self::parseNumber($state))
                ->rules(['required', 'numeric', 'min:0'])
                ->example('24.95'),

            ImportColumn::make('current_price')
                ->label('السعر الحالي / الفعلي (ريال — اختياري)')
                ->fillRecordUsing(fn () => null)
                ->guess(['السعر الحالي (ريال)', 'السعر الحالي', 'السعر الفعلي', 'current_price'])
                ->castStateUsing(fn ($state) => self::parseNumber($state))
                ->example('13.95'),

            ImportColumn::make('sale_price')
                ->label('سعر الخصم (ريال — اختياري)')
                ->guess(['سعر الخصم (ريال)', 'سعر الخصم', 'سعر العرض', 'sale_price', 'Sale price'])
                ->castStateUsing(fn ($state) => self::parseNumber($state))
                ->rules(['nullable', 'numeric', 'min:0'])
                ->example('13.95'),

            ImportColumn::make('cost_price')
                ->label('سعر التكلفة (اختياري)')
                ->guess(['سعر التكلفة', 'التكلفة', 'cost_price', 'Cost'])
                ->castStateUsing(fn ($state) => self::parseNumber($state))
                ->rules(['nullable', 'numeric', 'min:0'])
                ->example(''),

            ImportColumn::make('barcode')
                ->label('الباركود')
                ->fillRecordUsing(function (Product $record, $state): void {
                    $clean = $state !== null ? trim((string) $state) : '';
                    if ($clean !== '') {
                        $record->barcode = $clean;
                    }
                })
                ->guess(['الباركود', 'barcode', 'Barcode', 'GTIN', 'GTIN, UPC, EAN, or ISBN'])
                ->castStateUsing(fn ($state) => $state !== null && trim((string) $state) !== '' ? trim((string) $state) : null)
                ->rules(['nullable', 'max:100'])
                ->example('3073781227338'),

            ImportColumn::make('main_category')
                ->label('القسم الرئيسي (اختياري)')
                ->fillRecordUsing(fn () => null)
                ->guess(['القسم الرئيسي', 'التصنيف الرئيسي', 'main_category', 'parent_category', 'Main Category'])
                ->example('الأجبان'),

            ImportColumn::make('categories_list')
                ->label('الأقسام / الأقسام الفرعية')
                ->fillRecordUsing(fn () => null)
                ->guess(['الأقسام الفرعية', 'الأقسام', 'التصنيف', 'القسم', 'categories_list', 'categories', 'Categories'])
                ->example('لبنة، افضل العروض'),

            ImportColumn::make('category_slugs')
                ->label('وسوم الأقسام (Slugs — اختياري)')
                ->fillRecordUsing(fn () => null)
                ->guess(['وسوم الأقسام (Slugs)', 'وسوم الأقسام', 'category_slugs'])
                ->example('cheese-cheese-labneh'),

            ImportColumn::make('brand_name')
                ->label('العلامة التجارية / البراند')
                ->fillRecordUsing(fn () => null)
                ->guess(['العلامة التجارية', 'البراند', 'الماركة', 'brand_name', 'brand', 'Brands'])
                ->example('المراعي'),

            ImportColumn::make('tags_list')
                ->label('وسوم العرض')
                ->fillRecordUsing(fn () => null)
                ->guess(['وسوم العرض', 'الوسوم', 'tags_list', 'tags', 'Tags'])
                ->example('عروض اليوم'),

            ImportColumn::make('primary_image')
                ->label('رابط الصورة الرئيسية')
                ->fillRecordUsing(fn () => null)
                ->guess(['رابط الصورة الرئيسية', 'الصورة الرئيسية', 'الصورة', 'image', 'main_image'])
                ->example('https://example.com/1.png'),

            ImportColumn::make('gallery_images')
                ->label('روابط الصور الفرعية (صور فرعية)')
                ->fillRecordUsing(fn () => null)
                ->guess(['صور فرعية', 'الصور الفرعية', 'روابط الصور الفرعية', 'صور إضافية', 'الصور الإضافية', 'معرض الصور', 'gallery_images', 'gallery', 'additional_images'])
                ->example('https://example.com/2.png | https://example.com/3.png'),

            ImportColumn::make('images_list')
                ->label('جميع روابط الصور (الرئيسية والفرعية معاً)')
                ->fillRecordUsing(fn () => null)
                ->guess(['جميع روابط الصور', 'روابط الصور', 'الصور', 'images_list', 'images', 'Images'])
                ->example('https://example.com/1.png | https://example.com/2.png'),

            ImportColumn::make('stock_status')
                ->label('متوفر (نعم / لا / instock / outofstock)')
                ->guess(['متوفر', 'حالة المخزون', 'stock_status', 'In stock?'])
                ->castStateUsing(fn ($state) => self::parseBool($state, true) ? 'instock' : 'outofstock')
                ->rules(['nullable', 'in:instock,outofstock'])
                ->example('نعم'),

            ImportColumn::make('stock_quantity')
                ->label('الكمية')
                ->guess(['الكمية', 'الكمية المتوفرة', 'المخزون', 'stock_quantity', 'Stock', 'quantity'])
                ->castStateUsing(function ($state) {
                    $num = self::parseNumber($state);
                    return $num !== null ? (int) $num : null;
                })
                ->rules(['nullable', 'integer', 'min:0'])
                ->example('100'),

            ImportColumn::make('manage_stock')
                ->label('تتبع الكمية (نعم / لا / 1 / 0)')
                ->guess(['تتبع الكمية', 'إدارة المخزون', 'manage_stock'])
                ->castStateUsing(fn ($state) => $state === null || $state === '' ? true : self::parseBool($state, true))
                ->example('1'),

            ImportColumn::make('security_stock')
                ->label('مخزون الأمان')
                ->guess(['مخزون الأمان', 'حد تنبيه المخزون', 'security_stock'])
                ->castStateUsing(function ($state) {
                    $num = self::parseNumber($state);
                    return $num !== null ? (int) $num : 5;
                })
                ->rules(['nullable', 'integer', 'min:0'])
                ->example('5'),

            ImportColumn::make('featured')
                ->label('منتج مميز (نعم / لا / 1 / 0)')
                ->guess(['منتج مميز', 'مميز', 'featured', 'Is featured?'])
                ->castStateUsing(fn ($state) => self::parseBool($state, false))
                ->example('نعم'),

            ImportColumn::make('sort_order')
                ->label('الوزن / الترتيب')
                ->guess(['الوزن / الترتيب', 'الترتيب', 'sort_order', 'Position'])
                ->castStateUsing(function ($state) {
                    $num = self::parseNumber($state);
                    return $num !== null ? (int) $num : 0;
                })
                ->rules(['nullable', 'integer'])
                ->example('1'),

            ImportColumn::make('type')
                ->label('النوع')
                ->guess(['النوع', 'type', 'Type'])
                ->castStateUsing(function ($state) {
                    $val = strtolower(trim((string) $state));
                    return $val === 'variable' ? 'variable' : 'simple';
                })
                ->rules(['nullable', 'in:simple,variable'])
                ->example('simple'),

            ImportColumn::make('unit')
                ->label('الوحدة')
                ->guess(['الوحدة', 'unit'])
                ->rules(['nullable', 'max:50'])
                ->example(''),

            ImportColumn::make('bundle_qty')
                ->label('كمية الحزمة')
                ->guess(['كمية الحزمة', 'bundle_qty'])
                ->castStateUsing(function ($state) {
                    $num = self::parseNumber($state);
                    return $num !== null && $num >= 2 ? (int) $num : null;
                })
                ->rules(['nullable', 'integer', 'min:2'])
                ->example(''),

            ImportColumn::make('weight_value')
                ->label('الوزن الفعلي (كجم)')
                ->guess(['الوزن (كجم)', 'weight_value', 'Weight (kg)'])
                ->castStateUsing(fn ($state) => self::parseNumber($state))
                ->rules(['nullable', 'numeric', 'min:0'])
                ->example(''),

            ImportColumn::make('short_description')
                ->label('وصف مختصر (عربي)')
                ->guess(['وصف مختصر (عربي)', 'وصف مختصر', 'short_description', 'Short description'])
                ->rules(['nullable'])
                ->example(''),

            ImportColumn::make('short_description_en')
                ->label('وصف مختصر (إنجليزي)')
                ->guess(['وصف مختصر (إنجليزي)', 'short_description_en'])
                ->rules(['nullable'])
                ->example(''),

            ImportColumn::make('description_en')
                ->label('الوصف (إنجليزي)')
                ->guess(['الوصف (إنجليزي)', 'الوصف الكامل (إنجليزي)', 'description_en'])
                ->rules(['nullable'])
                ->example(''),

            ImportColumn::make('status')
                ->label('حالة النشر (publish / draft)')
                ->guess(['حالة النشر', 'status', 'Published'])
                ->castStateUsing(function ($state) {
                    if ($state === null || trim((string) $state) === '') {
                        return 'publish';
                    }
                    $val = strtolower(trim((string) $state));
                    if (in_array($val, ['draft', '0', 'لا', 'مسودة'], true)) {
                        return 'draft';
                    }
                    if ($val === 'private') {
                        return 'private';
                    }
                    return 'publish';
                })
                ->rules(['nullable', 'in:publish,draft,private'])
                ->example('publish'),

            ImportColumn::make('slug')
                ->label('الرابط الدائم (Slug)')
                ->guess(['الرابط (Slug)', 'الرابط', 'slug', 'Slug'])
                ->rules(['nullable', 'max:500'])
                ->example(''),
        ];
    }

    public static function cleanDescription(mixed $state): ?string
    {
        if ($state === null) {
            return null;
        }
        $text = trim((string) $state);
        if ($text === '') {
            return null;
        }

        // Only unwrap outer quotes when the entire string is wrapped in a matching pair
        while (strlen($text) >= 2 && str_starts_with($text, '"') && str_ends_with($text, '"') && substr_count($text, '"') === 2) {
            $text = trim(substr($text, 1, -1));
        }
        $text = str_replace('""', '"', $text);

        // Strip internal editorial placeholder note if present
        $text = trim((string) preg_replace('/^بحاجة لتغيير ال[ىي] اللغة العربية\.?\s*/u', '', $text));

        return $text !== '' ? $text : null;
    }

    public function resolveRecord(): ?Product
    {
        $name = trim((string) ($this->data['name'] ?? ''));

        // Skip repeated header rows accidentally pasted in the middle of merged CSV sheets
        if (
            $name === '' ||
            in_array($name, ['اسم المنتج (عربي)', 'اسم المنتج', 'name', 'Name'], true) ||
            ($this->data['regular_price'] === null && $this->data['current_price'] === null)
        ) {
            return null;
        }

        $sku = trim((string) ($this->data['sku'] ?? ''));
        if ($sku === '') {
            $sku = trim((string) ($this->data['item_number'] ?? ''));
            if ($sku !== '') {
                $this->data['sku'] = $sku;
            }
        }

        if ($sku !== '') {
            $existing = Product::where('sku', $sku)->first();
            if ($existing) {
                return $existing;
            }
        }

        // Only match by barcode when the row has no SKU, OR when the matched record itself has no SKU
        // (prevents overwriting a different pack size that shares a supplier barcode, e.g. 200g vs 400g)
        if (!empty($this->data['barcode'])) {
            $barcode = trim((string) $this->data['barcode']);
            $existing = Product::where('barcode', $barcode)
                ->when($sku !== '', fn ($q) => $q->where(fn ($sub) => $sub->whereNull('sku')->orWhere('sku', '')))
                ->first();
            if ($existing) {
                return $existing;
            }
        }

        if (!empty($this->data['slug'])) {
            $existing = Product::where('slug', trim((string) $this->data['slug']))->first();
            if ($existing) {
                return $existing;
            }
        }

        return new Product();
    }

    protected function beforeValidate(): void
    {
        if (empty($this->data['sku']) && !empty($this->data['item_number'])) {
            $this->data['sku'] = trim((string) $this->data['item_number']);
        }

        // Support files where "السعر الحالي (ريال)" holds the discounted selling price
        // while "سعر الخصم (ريال)" is 0 and "السعر الأصلي (ريال)" holds the pre-discount price
        $regular = $this->data['regular_price'] ?? null;
        $current = $this->data['current_price'] ?? null;
        $sale    = $this->data['sale_price'] ?? null;

        if (($regular === null || $regular <= 0) && $current !== null && $current > 0) {
            $this->data['regular_price'] = $current;
            $regular = $current;
        }

        if ($sale !== null && $sale <= 0) {
            $this->data['sale_price'] = null;
            $sale = null;
        }

        if ($sale === null && $current !== null && $regular !== null && $current > 0 && $current < $regular) {
            $this->data['sale_price'] = $current;
        }
    }

    private function resolveOrCreateBrand(string $rawBrand): BrandSetting
    {
        $upper = strtoupper(trim($rawBrand));
        $slugCandidate = mb_strtolower((string) preg_replace('/[^\p{Arabic}a-z0-9]+/iu', '-', $rawBrand));
        $slugCandidate = trim($slugCandidate, '-');

        $mapped = self::BRAND_CODE_MAP[$upper] ?? null;
        $arabicName = $mapped['name'] ?? $rawBrand;
        $englishName = $mapped['name_en'] ?? (preg_match('/^[A-Z0-9\-_ ]+$/', $rawBrand)
            ? ucwords(strtolower(str_replace(['-', '_'], ' ', $rawBrand)))
            : null);

        $brand = BrandSetting::query()
            ->where('slug', $slugCandidate)
            ->orWhere('name', $arabicName)
            ->orWhere('name', $rawBrand)
            ->when($englishName, fn ($q) => $q->orWhere('name_en', $englishName))
            ->first();

        if (!$brand) {
            return BrandSetting::create([
                'name'      => $arabicName,
                'name_en'   => $englishName,
                'slug'      => $slugCandidate ?: null,
                'is_active' => true,
            ]);
        }

        $updates = [];
        if ($mapped !== null && $brand->name === $upper) {
            $updates['name'] = $arabicName;
        }
        if (empty($brand->name_en) && $englishName !== null) {
            $updates['name_en'] = $englishName;
        }
        if (!empty($updates)) {
            $brand->update($updates);
        }

        return $brand;
    }

    protected function beforeSave(): void
    {
        $this->record->type = $this->record->type ?: 'simple';
        $this->record->status = $this->record->status ?: 'publish';
        $this->record->stock_status = $this->record->stock_status ?: 'instock';
        $this->record->manage_stock = $this->record->manage_stock ?? ($this->record->stock_quantity !== null);
        $this->record->sort_order = $this->record->sort_order ?? 0;

        if (!$this->record->exists && empty($this->record->published_at)) {
            $this->record->published_at = now();
        }

        // Auto-extract unit (e.g., "400 جم", "1 كجم", "500 مل", "6 حبات") from Arabic name if unit is empty
        if (empty($this->record->unit) && !empty($this->record->name)) {
            if (preg_match('/(\d+(?:[.,]\d+)?\s*(?:كجم|جم|جرام|مل|لتر|حبة|حبات|قطعة|قطع|مكعبات|شريحة|شرائح))/u', $this->record->name, $m)) {
                $this->record->unit = trim($m[1]);
            }
        }

        // Brand resolution ("العلامة التجارية" / "البراند")
        $resolvedBrand = null;
        $brandName = trim((string) ($this->data['brand_name'] ?? ''));
        if ($brandName !== '') {
            $resolvedBrand = $this->resolveOrCreateBrand($brandName);
            $this->record->brand_setting_id = $resolvedBrand->id;
        }

        // Auto-fallback Arabic description when the Excel "الوصف (عربي)" cell is empty on a row
        if (empty($this->record->description) && !empty($this->record->name)) {
            $parts = [$this->record->name];
            if ($resolvedBrand && !empty($resolvedBrand->name)) {
                $parts[] = 'من ' . $resolvedBrand->name;
            }
            $catsRaw = trim((string) ($this->data['categories_list'] ?? ''));
            if ($catsRaw !== '') {
                $catNames = array_values(array_filter(
                    array_map('trim', preg_split('/[,،|]+/u', $catsRaw)),
                    fn (string $c) => $c !== '' && !str_contains($c, 'العروض')
                ));
                if (!empty($catNames)) {
                    $parts[] = 'ضمن قسم ' . implode(' و', array_slice($catNames, 0, 2));
                }
            }
            $fallback = implode('، ', $parts);
            if (!empty($this->record->name_en)) {
                $fallback .= ' (' . trim((string) $this->record->name_en) . ')';
            }
            $this->record->description = $fallback . '.';
        }

        // Images resolution:
        // 1. Primary cover image ("رابط الصورة الرئيسية") always comes first (index 0)
        // 2. Sub-images / gallery ("صور فرعية") follow immediately in exact order
        // 3. Combined list ("جميع روابط الصور") acts as fallback / completeness check without duplicating URLs
        $rawSources = [
            trim((string) ($this->data['primary_image'] ?? '')),
            trim((string) ($this->data['gallery_images'] ?? '')),
            trim((string) ($this->data['images_list'] ?? '')),
        ];

        $collectedUrls = [];
        foreach ($rawSources as $sourceText) {
            if ($sourceText === '') {
                continue;
            }
            $parts = preg_split('/[,،|;\r\n]+|\s+(?=https?:\/\/)/iu', $sourceText) ?: [];
            foreach ($parts as $part) {
                $cleanUrl = trim($part);
                if (
                    $cleanUrl !== '' &&
                    (str_starts_with($cleanUrl, 'http://') || str_starts_with($cleanUrl, 'https://') || str_starts_with($cleanUrl, 'products/'))
                ) {
                    $collectedUrls[] = $cleanUrl;
                }
            }
        }

        $urls = array_values(array_unique($collectedUrls));
        if (!empty($urls)) {
            $this->record->images = $urls;
        }
    }

    private function resolveRootParentCategory(?string $firstImage): ?Category
    {
        $nestUnderParent = !array_key_exists('nest_under_parent', $this->options)
            || self::parseBool($this->options['nest_under_parent'], true);

        // 1. Explicit per-row column "القسم الرئيسي" always takes priority
        $rowMainName = trim((string) ($this->data['main_category'] ?? ''));
        if ($rowMainName !== '') {
            return $this->findOrCreateRootCategory($rowMainName, $firstImage);
        }

        if (!$nestUnderParent) {
            return null;
        }

        // 2. Selected existing root category in import modal options
        $optParentId = (int) ($this->options['parent_category_id'] ?? 0);
        if ($optParentId > 0) {
            $existing = Category::find($optParentId);
            if ($existing) {
                if (empty($existing->image_path) && empty($existing->external_image_url) && $firstImage) {
                    $existing->update(['external_image_url' => $firstImage]);
                }
                return $existing;
            }
        }

        // 3. Explicit or auto-filled root category name in import modal options
        $optParentName = trim((string) ($this->options['parent_category_name'] ?? ''));
        if ($optParentName !== '') {
            return $this->findOrCreateRootCategory($optParentName, $firstImage);
        }

        // 4. Automatic detection from row category slugs ("cheese-*") or uploaded file name ("منتجات_الأجبان_نينجا.xlsx")
        $detected = self::detectMainCategoryName(
            $this->import->file_name ?? null,
            [['category_slugs' => $this->data['category_slugs'] ?? '']]
        );

        if ($detected !== null && $detected !== '') {
            return $this->findOrCreateRootCategory($detected, $firstImage);
        }

        return null;
    }

    private function findOrCreateRootCategory(string $name, ?string $firstImage): Category
    {
        $cat = Category::query()
            ->whereNull('parent_id')
            ->where(fn ($q) => $q->where('name', $name)->orWhere('slug', $name))
            ->first();

        if (!$cat) {
            $cat = Category::create([
                'name'               => $name,
                'parent_id'          => null,
                'external_image_url' => $firstImage,
                'is_active'          => true,
            ]);
        } elseif (empty($cat->image_path) && empty($cat->external_image_url) && $firstImage) {
            $cat->update(['external_image_url' => $firstImage]);
        }

        return $cat;
    }

    private function inferFallbackSubcategoryName(string $productName): string
    {
        if (preg_match('/(زبدة|سمن)/u', $productName)) {
            return 'زبدة وسمن';
        }
        if (preg_match('/(كريمة|قشطة)/u', $productName)) {
            return 'قشطة وكريمة';
        }
        if (preg_match('/(زيتون|مخلل|طرشي|معبوج|فلفل|مش حجاز)/u', $productName)) {
            return 'مخللات طازجة';
        }
        if (preg_match('/لبن[ةه]/u', $productName)) {
            return 'لبنة';
        }

        return 'متنوعات';
    }

    protected function afterSave(): void
    {
        $images = is_array($this->record->images) ? $this->record->images : [];
        $firstImage = $images[0] ?? null;

        // Resolve main root department (e.g. "الأجبان") so all subcategories in the file nest directly underneath it
        $rootParent = $this->resolveRootParentCategory($firstImage);

        $categoriesRaw = trim((string) ($this->data['categories_list'] ?? ''));
        if ($categoriesRaw === '' && $rootParent !== null) {
            $categoriesRaw = $this->inferFallbackSubcategoryName((string) $this->record->name);
        }

        if ($categoriesRaw !== '') {
            $items = array_values(array_unique(array_filter(array_map('trim', preg_split('/[,،|]+/u', $categoriesRaw)))));
            $slugsRaw = trim((string) ($this->data['category_slugs'] ?? ''));
            $slugsList = $slugsRaw !== ''
                ? array_values(array_filter(array_map('trim', preg_split('/[,،|\s]+/u', strtolower($slugsRaw)))))
                : [];

            $catIds = [];
            foreach ($items as $idx => $rawItem) {
                // Support "القسم الرئيسي > القسم الفرعي" hierarchy inside cell values as well
                $chain = array_values(array_filter(array_map('trim', explode('>', $rawItem))));
                if (empty($chain)) {
                    continue;
                }

                $currentParent = $rootParent;
                $lastCat = null;

                foreach ($chain as $depth => $stepName) {
                    // If the first segment repeats the root parent name (e.g. "الأجبان > لبنة"), step into it without duplicating
                    if ($depth === 0 && count($chain) > 1 && $currentParent && mb_strtolower($stepName) === mb_strtolower($currentParent->name)) {
                        continue;
                    }

                    $childName = $stepName;
                    if ($currentParent && mb_strtolower($childName) === mb_strtolower($currentParent->name)) {
                        $childName = $stepName . ' متنوعة';
                    }

                    $parentId = $currentParent?->id;

                    $cat = Category::query()
                        ->where('name', $childName)
                        ->where('parent_id', $parentId)
                        ->first();

                    // Adopt a previously imported flat root category (if it has no children) under $parentId to prevent duplicates
                    if (!$cat && $parentId !== null) {
                        $orphan = Category::query()
                            ->where('name', $childName)
                            ->whereNull('parent_id')
                            ->where('id', '!=', $parentId)
                            ->doesntHave('children')
                            ->first();
                        if ($orphan) {
                            $orphan->update(['parent_id' => $parentId]);
                            $cat = $orphan;
                        }
                    }

                    if (!$cat) {
                        $preferredSlug = (count($chain) === 1 && isset($slugsList[$idx]) && $slugsList[$idx] !== '')
                            ? $slugsList[$idx]
                            : ($currentParent ? "{$currentParent->slug}-{$childName}" : $childName);

                        $cat = Category::create([
                            'name'               => $childName,
                            'slug'               => $preferredSlug,
                            'parent_id'          => $parentId,
                            'external_image_url' => $firstImage,
                            'is_active'          => true,
                        ]);
                    } elseif (empty($cat->image_path) && empty($cat->external_image_url) && $firstImage) {
                        $cat->update(['external_image_url' => $firstImage]);
                    }

                    $currentParent = $cat;
                    $lastCat = $cat;
                }

                if ($lastCat) {
                    $catIds[] = $lastCat->id;
                }
            }

            if (!empty($catIds)) {
                $uniqueCatIds = array_values(array_unique($catIds));
                if (isset(self::$touchedProductIds[$this->record->id])) {
                    $this->record->categories()->syncWithoutDetaching($uniqueCatIds);
                } else {
                    $this->record->categories()->sync($uniqueCatIds);
                    self::$touchedProductIds[$this->record->id] = true;
                }
            }
        }

        // Tags sync
        $tagsRaw = trim((string) ($this->data['tags_list'] ?? ''));
        if ($tagsRaw !== '') {
            $names = array_values(array_unique(array_filter(array_map('trim', preg_split('/[,،|]+/u', $tagsRaw)))));
            $tagIds = [];
            foreach ($names as $tagName) {
                $tag = Tag::where('name', $tagName)->orWhere('slug', $tagName)->first();
                if (!$tag) {
                    $tag = Tag::create([
                        'name'      => $tagName,
                        'is_active' => true,
                    ]);
                }
                $tagIds[] = $tag->id;
            }
            if (!empty($tagIds)) {
                $this->record->tags()->sync($tagIds);
            }
        }
    }

    public static function getCompletedNotificationBody(Import $import): string
    {
        $count = number_format($import->successful_rows);
        $body = "تم استيراد وتحديث {$count} منتج بنجاح.";

        if ($failedRowsCount = $import->getFailedRowsCount()) {
            $body .= ' تعذّر استيراد ' . number_format($failedRowsCount) . ' صف (يمكنك تحميل ملف الأخطاء لمراجعتها).';
        }

        return $body;
    }
}
