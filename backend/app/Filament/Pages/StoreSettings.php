<?php

namespace App\Filament\Pages;

use App\Models\AppSetting;
use App\Services\FcmService;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Illuminate\Support\Facades\Cache;

class StoreSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-cog-6-tooth';
    protected static ?string $navigationLabel = 'إعدادات المتجر';
    protected static ?string $title           = 'إعدادات المتجر';
    protected static ?int    $navigationSort  = 10;
    protected string $view = 'filament.pages.store-settings';

    // form fields
    public float  $delivery_fee            = 25.0;
    public float  $free_shipping_threshold = 100.0;
    public float  $min_order_value         = 35.0;
    public string $whatsapp_phone          = '';
    public string $support_phone           = '';
    public string $support_email           = '';
    public string $working_hours_weekday   = '';
    public string $working_hours_friday    = '';
    public bool   $announcement_active     = false;
    public string $announcement_text       = '';
    public string $badge1_label            = '';
    public string $badge2_label            = '';
    public string $badge3_label            = '';
    public string $badge4_label            = '';
    public bool   $gift_enabled            = true;
    public int    $gift_product_id         = 175115;
    public float  $gift_min_amount         = 200.0;
    public string $gift_label              = 'هدية مجانية';
    public int    $default_max_qty         = 10;

    // Free delivery near branch
    public bool   $free_delivery_near_branch_enabled = false;
    public float  $branch_lat                        = 24.598000;
    public float  $branch_lng                        = 46.639308;
    public float  $free_delivery_radius_km           = 5.0;
    public float  $near_branch_delivery_fee          = 0.0;
    public ?float $near_branch_free_threshold        = null;

    // Cash on Delivery
    public bool   $cod_enabled                       = false;
    public bool   $cod_fee_enabled                   = false;
    public float  $cod_fee_amount                    = 0.0;

    // Welcome Offer
    public bool   $welcome_offer_active              = false;
    public string $welcome_offer_type                = 'discount';
    public int    $welcome_offer_discount_percent    = 15;
    public float  $welcome_offer_discount_amount     = 20.0;
    public float  $welcome_offer_discount_min_order  = 0.0;
    public int    $welcome_offer_expiry_days         = 3;
    public ?int   $welcome_offer_gift_product_id     = null;
    public string $welcome_offer_gift_product_name   = '';
    public string $welcome_offer_gift_image          = '';

    // Promo Popup (persistent)
    public bool   $promo_popup_active         = false;
    public string $promo_popup_title          = '';
    public string $promo_popup_description    = '';
    public string $promo_popup_coupon_code    = '';
    public string $promo_popup_expires_label  = '';
    public string $promo_popup_image          = '';

    public function mount(): void
    {
        $s = AppSetting::current();
        $data = $s->only([
            'delivery_fee', 'free_shipping_threshold', 'min_order_value',
            'whatsapp_phone', 'support_phone', 'support_email',
            'working_hours_weekday', 'working_hours_friday',
            'announcement_active', 'announcement_text',
            'badge1_label', 'badge2_label', 'badge3_label', 'badge4_label',
            'gift_enabled', 'gift_product_id', 'gift_min_amount', 'gift_label',
            'default_max_qty',
            'free_delivery_near_branch_enabled', 'branch_lat', 'branch_lng', 'free_delivery_radius_km',
            'near_branch_delivery_fee', 'near_branch_free_threshold',
            'cod_enabled', 'cod_fee_enabled', 'cod_fee_amount',
            'welcome_offer_active', 'welcome_offer_type',
            'welcome_offer_discount_percent', 'welcome_offer_discount_amount',
            'welcome_offer_discount_min_order',
            'welcome_offer_expiry_days',
            'welcome_offer_gift_product_id', 'welcome_offer_gift_product_name', 'welcome_offer_gift_image',
            'promo_popup_active', 'promo_popup_title', 'promo_popup_description',
            'promo_popup_coupon_code', 'promo_popup_expires_label', 'promo_popup_image',
        ]);
        // Coerce nullable string fields to empty string to satisfy typed properties
        $data['welcome_offer_type']              ??= 'discount';
        $data['welcome_offer_gift_product_name'] ??= '';
        $data['welcome_offer_gift_image']        ??= '';
        $data['promo_popup_title']               ??= '';
        $data['promo_popup_description']         ??= '';
        $data['promo_popup_coupon_code']         ??= '';
        $data['promo_popup_expires_label']       ??= '';
        $data['promo_popup_image']               ??= '';
        $this->fill($data);
        $this->form->fill($data);
    }

    public function form(\Filament\Schemas\Schema $form): \Filament\Schemas\Schema
    {
        return $form->components([

            Section::make('🚚 أسعار التوصيل')
                ->description('هذي إعدادات احتياطية فقط — تُستخدم للعميل فقط إذا مدينته/منطقته ما تطابق أي "منطقة توصيل" مفعّلة بصفحة "مناطق التوصيل". إذا عندك منطقة توصيل مفعّلة تغطي عملاءك (مثل الرياض)، فسعرها هو الفعلي المطبّق فعليًا، مو السعر هنا.')
                ->schema([
                Grid::make(3)->schema([
                    TextInput::make('delivery_fee')
                        ->label('سعر التوصيل الأساسي (ر.س) — احتياطي')
                        ->numeric()->minValue(0)->required(),
                    TextInput::make('free_shipping_threshold')
                        ->label('حد الشحن المجاني (ر.س)')
                        ->numeric()->minValue(0)->required()
                        ->helperText('الطلبات فوق هذا الحد شحنها مجاني'),
                    TextInput::make('min_order_value')
                        ->label('الحد الأدنى للطلب (ر.س)')
                        ->numeric()->minValue(0)->required(),
                ]),
            ]),

            Section::make('🚴 التوصيل القريب من الفرع')->schema([
                Toggle::make('free_delivery_near_branch_enabled')
                    ->label('تفعيل توصيل خاص للمناطق القريبة من الفرع')
                    ->helperText('يُطبَّق فقط على العملاء اللي يحددون موقعهم عبر الخريطة عند الطلب — يظهر في التطبيق باسم "توصيل قريب"')
                    ->live(),
                Grid::make(4)->schema([
                    TextInput::make('branch_lat')
                        ->label('خط عرض الفرع (Latitude)')
                        ->numeric()
                        ->required()
                        ->helperText('مثال: 24.598000'),
                    TextInput::make('branch_lng')
                        ->label('خط طول الفرع (Longitude)')
                        ->numeric()
                        ->required()
                        ->helperText('مثال: 46.639308'),
                    TextInput::make('free_delivery_radius_km')
                        ->label('نصف القطر (كم)')
                        ->numeric()
                        ->minValue(0)
                        ->required()
                        ->suffix('كم'),
                    TextInput::make('near_branch_delivery_fee')
                        ->label('رسوم التوصيل القريب (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->required()
                        ->suffix('ر.س')
                        ->helperText('اتركه 0 ليكون التوصيل مجاناً بالكامل'),
                ])->visible(fn ($get) => $get('free_delivery_near_branch_enabled')),
                TextInput::make('near_branch_free_threshold')
                    ->label('التوصيل القريب يصير مجاني فوق (ر.س)')
                    ->numeric()
                    ->minValue(0)
                    ->suffix('ر.س')
                    ->helperText('حد خاص بالنطاق القريب فقط (منفصل عن "حد الشحن المجاني" العام) — اتركه فارغاً لتطبيق رسوم التوصيل القريب دائماً بغض النظر عن قيمة الطلب')
                    ->visible(fn ($get) => $get('free_delivery_near_branch_enabled')),
            ]),

            Section::make('💵 الدفع عند الاستلام')->schema([
                Toggle::make('cod_enabled')
                    ->label('تفعيل الدفع عند الاستلام')
                    ->helperText('يظهر للعميل كخيار دفع بديل عن البطاقة عند إتمام الطلب')
                    ->live(),
                Grid::make(2)->schema([
                    Toggle::make('cod_fee_enabled')
                        ->label('إضافة رسوم على الدفع عند الاستلام')
                        ->helperText('اتركها متوقفة ليكون الدفع عند الاستلام بدون أي رسوم إضافية')
                        ->live(),
                    TextInput::make('cod_fee_amount')
                        ->label('قيمة الرسوم (ر.س)')
                        ->numeric()->minValue(0)->required()
                        ->suffix('ر.س')
                        ->visible(fn ($get) => $get('cod_fee_enabled')),
                ])->visible(fn ($get) => $get('cod_enabled')),
            ]),

            Section::make('📞 معلومات التواصل')->schema([
                Grid::make(2)->schema([
                    TextInput::make('whatsapp_phone')
                        ->label('رقم واتساب')
                        ->placeholder('966545555340')
                        ->helperText('بدون + أو مسافات'),
                    TextInput::make('support_phone')
                        ->label('رقم الهاتف للدعم')
                        ->placeholder('966545555340'),
                    TextInput::make('support_email')
                        ->label('البريد الإلكتروني للدعم')
                        ->email()
                        ->placeholder('order@storeseco.com'),
                ]),
                Grid::make(2)->schema([
                    TextInput::make('working_hours_weekday')
                        ->label('ساعات العمل (السبت–الخميس)')
                        ->placeholder('السبت – الخميس: 8:00 ص – 11:00 م'),
                    TextInput::make('working_hours_friday')
                        ->label('ساعات العمل (الجمعة)')
                        ->placeholder('الجمعة: 2:00 م – 11:00 م'),
                ]),
            ]),

            Section::make('📣 شريط الإعلان')->schema([
                Toggle::make('announcement_active')
                    ->label('تفعيل الشريط')
                    ->helperText('يظهر الشريط أسفل البنر في الصفحة الرئيسية'),
                TextInput::make('announcement_text')
                    ->label('نص الإعلان')
                    ->placeholder('مثال: عرض خاص! توصيل مجاني طوال هذا الأسبوع')
                    ->maxLength(100)
                    ->columnSpanFull(),
            ]),

            Section::make('🎁 الهدية المجانية')->schema([
                Grid::make(2)->schema([
                    Toggle::make('gift_enabled')
                        ->label('تفعيل الهدية المجانية')
                        ->helperText('عند التفعيل تُضاف الهدية تلقائياً عند بلوغ الحد الأدنى'),
                    TextInput::make('gift_label')
                        ->label('اسم الهدية')
                        ->placeholder('هدية مجانية')
                        ->maxLength(60),
                ]),
                Grid::make(2)->schema([
                    Select::make('gift_product_id')
                        ->label('منتج الهدية المجانية')
                        ->searchable()
                        ->options(fn () => \App\Models\Product::orderBy('name')->limit(100)->pluck('name', 'id')->toArray())
                        ->helperText('اختر المنتج الذي يُضاف كهدية مجانية من كتالوج المتجر'),
                    TextInput::make('gift_min_amount')
                        ->label('الحد الأدنى للسلة (ر.س)')
                        ->numeric()
                        ->minValue(0)
                        ->required()
                        ->helperText('تُضاف الهدية عند تجاوز هذا المبلغ'),
                ]),
            ]),

            Section::make('📦 حدود الكميات')->schema([
                TextInput::make('default_max_qty')
                    ->label('الحد الأقصى الافتراضي للكمية (لكل المنتجات)')
                    ->numeric()
                    ->minValue(1)
                    ->required()
                    ->helperText('ينطبق على كل المنتجات — يمكن تخصيص حد أقل لمنتجات معينة من "حدود الكميات"'),
            ]),

            Section::make('🎉 العرض الترحيبي (Popup)')->schema([
                Grid::make(2)->schema([
                    Toggle::make('welcome_offer_active')
                        ->label('تفعيل العرض الترحيبي')
                        ->helperText('يظهر للعميل مرة واحدة عند أول تشغيل للتطبيق')
                        ->live(),
                    Select::make('welcome_offer_type')
                        ->label('نوع العرض')
                        ->options([
                            'discount'       => '🏷️ كود خصم (نسبة %)',
                            'fixed_discount' => '💰 كوبون بمبلغ ثابت (ر.س)',
                            'gift'           => '🎁 هدية مجانية',
                        ])
                        ->default('discount')
                        ->live()
                        ->visible(fn ($get) => $get('welcome_offer_active')),
                ]),

                // Discount amount — only the "how much" field differs by type
                Grid::make(3)->schema([
                    TextInput::make('welcome_offer_discount_percent')
                        ->label('نسبة الخصم (%)')
                        ->numeric()->minValue(1)->maxValue(100)->required()
                        ->suffix('%')
                        ->helperText('مثال: 15 يعني خصم 15%')
                        ->visible(fn ($get) => $get('welcome_offer_type') === 'discount'),
                    TextInput::make('welcome_offer_discount_amount')
                        ->label('قيمة الخصم (ر.س)')
                        ->numeric()->minValue(1)->required()
                        ->suffix('ر.س')
                        ->helperText('مثال: 20 يعني خصم 20 ر.س ثابت من قيمة السلة')
                        ->visible(fn ($get) => $get('welcome_offer_type') === 'fixed_discount'),
                    TextInput::make('welcome_offer_discount_min_order')
                        ->label('الحد الأدنى للطلب (ر.س)')
                        ->numeric()->minValue(0)
                        ->suffix('ر.س')
                        ->helperText('0 = بدون حد أدنى'),
                    TextInput::make('welcome_offer_expiry_days')
                        ->label('صلاحية الكوبون (أيام)')
                        ->numeric()->minValue(1)->required()
                        ->suffix('يوم')
                        ->helperText('عدد أيام من لحظة توليد الكوبون'),
                ])->visible(fn ($get) => $get('welcome_offer_active') && in_array($get('welcome_offer_type'), ['discount', 'fixed_discount'])),

                // Gift fields
                Grid::make(3)->schema([
                    TextInput::make('welcome_offer_gift_product_id')
                        ->label('ID منتج الهدية (WooCommerce)')
                        ->numeric()->minValue(1)
                        ->helperText('رقم المنتج من لوحة WooCommerce'),
                    TextInput::make('welcome_offer_gift_product_name')
                        ->label('اسم المنتج')
                        ->placeholder('مثال: عطر رجالي 50ml')
                        ->maxLength(100),
                    TextInput::make('welcome_offer_gift_image')
                        ->label('رابط صورة المنتج')
                        ->placeholder('https://...')
                        ->url()
                        ->maxLength(500),
                ])->visible(fn ($get) => $get('welcome_offer_active') && $get('welcome_offer_type') === 'gift'),
            ]),

            Section::make('📢 بوب‑أب الخصومات المستمرة')->schema([
                Grid::make(2)->schema([
                    Toggle::make('promo_popup_active')
                        ->label('تفعيل البوب‑أب')
                        ->helperText('يظهر لجميع العملاء في كل فتحة للتطبيق ما دام مفعّلاً')
                        ->live(),
                ]),
                Grid::make(2)->schema([
                    TextInput::make('promo_popup_title')
                        ->label('العنوان')
                        ->placeholder('مثال: عرض الأسبوع 🔥')
                        ->maxLength(80),
                    TextInput::make('promo_popup_description')
                        ->label('الوصف')
                        ->placeholder('مثال: خصم 20% على جميع المنتجات')
                        ->maxLength(150),
                ])->visible(fn ($get) => $get('promo_popup_active')),
                Grid::make(3)->schema([
                    TextInput::make('promo_popup_coupon_code')
                        ->label('كود الخصم')
                        ->placeholder('مثال: SUMMER20')
                        ->maxLength(50)
                        ->helperText('العميل يضغط لنسخه'),
                    TextInput::make('promo_popup_expires_label')
                        ->label('نص الصلاحية (اختياري)')
                        ->placeholder('مثال: ينتهي 30 يونيو')
                        ->maxLength(60),
                    TextInput::make('promo_popup_image')
                        ->label('رابط الصورة (اختياري)')
                        ->placeholder('https://...')
                        ->url()
                        ->maxLength(500),
                ])->visible(fn ($get) => $get('promo_popup_active')),
            ]),

            Section::make('✅ شعارات الثقة')->schema([
                Grid::make(4)->schema([
                    TextInput::make('badge1_label')->label('الشعار 1')->placeholder('توصيل سريع'),
                    TextInput::make('badge2_label')->label('الشعار 2')->placeholder('دفع آمن'),
                    TextInput::make('badge3_label')->label('الشعار 3')->placeholder('إرجاع مجاني'),
                    TextInput::make('badge4_label')->label('الشعار 4')->placeholder('جودة مضمونة'),
                ]),
            ]),

        ])->statePath('');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        // Filament may return null for empty text fields — coerce to empty string
        // to avoid NOT NULL constraint violations in SQLite.
        $textFields = [
            'announcement_text', 'whatsapp_phone', 'support_phone', 'support_email',
            'working_hours_weekday', 'working_hours_friday',
            'badge1_label', 'badge2_label', 'badge3_label', 'badge4_label',
            'gift_label', 'welcome_offer_gift_product_name', 'welcome_offer_gift_image',
            'promo_popup_title', 'promo_popup_description', 'promo_popup_coupon_code',
            'promo_popup_expires_label', 'promo_popup_image',
        ];
        foreach ($textFields as $field) {
            $data[$field] = $data[$field] ?? '';
        }
        // welcome_offer_type has a CHECK constraint — default to 'discount' if hidden/null
        $data['welcome_offer_type'] = $data['welcome_offer_type'] ?? 'discount';

        AppSetting::current()->update($data);

        Cache::forget('app_config');

        Notification::make()
            ->title('تم حفظ الإعدادات بنجاح')
            ->success()
            ->send();
    }

    public function sendPromoNotification(): void
    {
        $s = AppSetting::current();

        if (empty($s->promo_popup_coupon_code)) {
            Notification::make()
                ->title('أدخل كود الخصم أولاً')
                ->warning()
                ->send();
            return;
        }

        $title = $s->promo_popup_title ?: '🔥 عرض خاص لك!';
        $body  = trim(($s->promo_popup_description ?: '') . ' — كود: ' . $s->promo_popup_coupon_code);

        $ok = app(FcmService::class)->sendToTopic('promotions', $title, $body, [
            'type'   => 'promo',
            'coupon' => $s->promo_popup_coupon_code,
            'route'  => '/browse',
        ]);

        if ($ok) {
            Notification::make()
                ->title('✅ تم إرسال الإشعار لجميع العملاء')
                ->success()
                ->send();
        } else {
            Notification::make()
                ->title('⚠️ تعذّر إرسال الإشعار — تحقق من إعداد Firebase')
                ->warning()
                ->send();
        }
    }
}
