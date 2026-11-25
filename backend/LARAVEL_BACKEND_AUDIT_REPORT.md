# تقرير الفحص الشامل للباك إند (Laravel — `ecostore-api-main`)

> **نطاق الفحص:** مشروع Laravel فقط (`c:\xampp\htdocs\store_tast\ecostore-api-main`) — يشمل المسارات (Routes)، المتحكمات (Controllers)، المصادقة والصلاحيات، الدفع والمحفظة (PayMob & Wallet)، تكامل WooCommerce، الخدمات الخارجية (FCM / SMS / WhatsApp / Snapchat)، الأوامر المجدولة، قاعدة البيانات والنماذج (Models & Migrations)، لوحة تحكم Filament، والإعدادات والنشر.
>
> **بيئة المشروع:** Laravel `^13.8` | PHP `^8.3` | Filament `^4.0` | Sanctum `^4.3` (مثبتة لكن غير مستخدمة فعلياً).

---

## 1. الملخص التنفيذي (Executive Summary)

النظام يعمل كوسيط (API Backend + Filament Admin) بين تطبيق المتجر وقاعدة WooCommerce وبوابة الدفع PayMob. يظهر في الكود وجود جهود سابقة جيدة لإغلاق ثغرات خطيرة (مثل إعادة حساب أسعار المنتجات والكوبونات من السيرفر وإضافة `AuthorizesCustomer` و `OriginHttp`)، لكن الفحص العميق كشف **ثغرات أمنية حرجة**، **أخطاء تشغيلية ومالية فعلية في الإنتاج**، و**نقاط اختناق في الأداء وقاعدة البيانات** تحتاج إلى معالجة فورية.

| مستوى الخطورة | العدد | أبرز المحاور |
| :--- | :---: | :--- |
| 🔴 **حرج (Critical)** | **14** | صلاحيات مفقودة (IDOR) تتيح خصم محفظة غيرك وتسريب كل الطلبات والعملاء والفواتير، تحويل السلال المهجورة بدون صلاحية، XSS مخزّن في لوحة التحكم، ثغرة إعادة استخدام الكوبون للأبد، تجاوز رسوم التوصيل، وتعطل فعلي (`Fatal Error`) في توليد كوبون الترحيب وخصم المحفظة. |
| 🟠 **عالٍ (High)** | **13** | حالات تزامن (Race Conditions) تسبب شحن مزدوج أو خصم مزدوج للمحفظة، غياب كامل للـ Rate Limiting (قصف رسائل SMS وتخمين)، Webhook مفتوح عند غياب السر، تخزين Tokens و OTP بنص صريح بلا انتهاء صلاحية، خلل مزامنة حالات الطلبات، وخلل تذكير السلال المهجورة. |
| 🟡 **متوسط (Medium)** | **14** | غياب الكاش في Proxy المنتجات والتصنيفات، غياب فهارس (Indexes) حيوية في قاعدة البيانات، عدم كاش توكن Firebase OAuth2، استعلامات متكررة N+1، عدم إبطال كاش `app_config` في صفحات Filament، وعمليات متزامنة بطيئة بدون Queues. |
| 🔵 **منخفض / بنية ونشر (Low)** | **9** | تكرار الكود وتضخم المتحكمات، غياب تام للاختبارات الآلية (0% Tests)، نقص متغيرات `.env.example`، تعطل `route:cache` في `deploy.sh`، وغياب صلاحيات/أدوار لوحة Filament. |

---

## 2. نقاط الضعف الأمنية (Security Vulnerabilities)

### 🔴 C-01: عدم التحقق من ملكية العميل عند الدفع بالبطاقة + المحفظة (سرقة رصيد محفظة الغير)
- **الموقع:** `app/Http/Controllers/Api/OrderController.php` (السطور `113-119` و `140`) + `app/Http/Controllers/Api/PaymentController.php` (`184-194`).
- **التفاصيل:** على عكس `CustomerController::createOrder` الذي يستخدم `verifiedCustomerId()`، فإن `OrderController` **لا يستخدم `AuthorizesCustomer` نهائياً**. عند استدعاء `POST /api/paymob-orders/create`، يثق السيرفر مباشرةً بـ `woo_customer_id` و `wallet_amount` القادمين من العميل دون أي Bearer Token، ثم يخصم مبلغ المحفظة من حساب ذلك العميل عند نجاح الدفع في `PaymentController::debitOrderWallet()`.
- **الأثر:** يمكن لأي مستخدم غير مصادق تمرير `woo_customer_id` الخاص بعميل آخر لاستخدام رصيد محفظته في تخفيض طلبه.
- **الحل الموصى به:** إضافة `use AuthorizesCustomer;` في `OrderController` واستخدام `$customerId = $this->verifiedCustomerId($request, $request->input('woo_customer_id'));` وعدم السماح بخصم المحفظة أو ربط الطلب بالحساب إلا بعد التحقق من التوكن.

---

### 🔴 C-02: تسريب كامل لطلبات المتجر وبيانات العملاء (Unauthenticated Data Exposure / IDOR)
- **المواقع:**
  1. `app/Http/Controllers/Api/CustomerController.php` (`634-663` — `GET /api/orders`): إذا لم يُرسل المعامل `?customer=`، يتجاوز الكود التحقق تماماً ويمرر `request->query()` مباشرةً إلى WooCommerce ليعيد **جميع طلبات المتجر لكل العملاء**. وحتى عند تمرير `?customer=123`، فإنه يستخدم `authorizeCustomerLenient` التي تسمح بالمرور إذا غاب هيدر `Authorization`!
  2. `app/Http/Controllers/Api/CustomerController.php` (`693-697` — `GET /api/customers/{id}`): **بدون أي مصادقة نهائياً**؛ يمكن استعراض بيانات أي عميل بالتسلسل الرقمي (`1, 2, 3...`).
  3. `app/Http/Controllers/Api/CustomerController.php` (`89-144` — `GET /api/customers/find?phone=`): **بدون مصادقة أو حد للطلبات**؛ يعيد كامل سجل العميل من WooCommerce (الاسم، الإيميل، العنوان، المعرّف، سجل الطلبات) بمجرد معرفة رقم الجوال.
  4. `app/Http/Controllers/Api/CustomerController.php` (`684-690` — `PUT /api/customers/{id}`): يستخدم `authorizeCustomerLenient`؛ حذف هيدر `Authorization` يسمح بتعديل بيانات أي عميل (الاسم، الإيميل، العنوان).
  5. `app/Http/Controllers/Api/AddressController.php` (`15-91` — `GET/POST/PUT/DELETE /api/addresses`): يستخدم `authorizeCustomerPhoneLenient`؛ حذف التوكن يتيح قراءة وتعديل وحذف عناوين وإحداثيات GPS أي عميل.
  6. `app/Http/Controllers/Api/OrderController.php` (`399-411` — `GET /api/paymob-orders/{id}/status`): بدون مصادقة؛ يكشف وجود الطلب وحالته و `woo_order_id`.
- **الحل الموصى به:**
  - فرض مصادقة صارمة (`authorizeCustomer` / `authorizeCustomerPhone`) على كل المسارات السابقة، ووضع خطة زمنية لإلغاء دوال `*Lenient` تماماً (أو تقييدها بإصدار تطبيق قديم لفترة انتقالية محدودة).
  - في `GET /api/orders`: استخراج `customer_id` دائماً من التوكن المصادق فقط وعدم قبول `?customer=` أو استعلام مفتوح بدون عميل.
  - في `GET /api/customers/find`: إرجاع `exists` و `has_previous_orders` فقط (أو حصره بالتحقق بعد OTP) دون تسريب بيانات PII.

---

### 🔴 C-03: فواتير الطباعة متاحة للعامة بدون تسجيل دخول (Unauthenticated PII Leak)
- **الموقع:** `routes/web.php` (`11-12`)، `app/Http/Controllers/PrintOrderController.php`، `app/Http/Controllers/PrintAbandonedCartController.php`.
- **التفاصيل:** المساران `/orders/{id}/print` و `/abandoned-carts/{id}/print` لا يحتويان على أي Middleware للمصادقة (`auth`) رغم أنهما يُفتحان من داخل لوحة تحكم Filament!
- **الأثر:** أي شخص على الإنترنت يمكنه فتح `/orders/1/print`، `/orders/2/print`... والاطلاع على الاسم الكامل، رقم الجوال، الإيميل، العنوان، رابط Google Maps لموقع المنزل، والمنتجات والمبالغ لجميع العملاء.
- **الحل الموصى به:** حماية المسارين بـ `->middleware('auth')` (أو نفس حارس Filament)، أو استخدام Signed URLs قصيرة الصلاحية (`URL::temporarySignedRoute`) عند الحاجة لمشاركتها.

---

### 🔴 C-04: مسارات إدارية للسلال المهجورة مكشوفة في الـ API العام بدون مصادقة
- **الموقع:** `routes/api.php` (`94-97`)، `app/Http/Controllers/Api/AbandonedCartController.php` (`14-138`).
- **التفاصيل:**
  - المساران `POST /api/abandoned-cart/{cart}/convert` و `PATCH /api/abandoned-cart/{cart}/status` مخصصان للوحة الإدارة (كما يذكر التعليق `called from Filament`)، لكنهما منشوران كمسارات API عامة بلا أي مصادقة!
  - المساران `POST /api/abandoned-cart` و `DELETE /api/abandoned-cart/{phone}` أيضاً بلا مصادقة، مما يسمح بالكتابة فوق سلة أي عميل (وتحفيز إرسال رسائل واتساب/إشعارات مزعجة له) أو حذف سلات العملاء.
- **الأثر:** أي مهاجم يمكنه تحويل كل السلال المهجورة في قاعدة البيانات إلى طلبات حقيقية (`cod` أو `bank_transfer`) في WooCommerce أو تخريب حالاتها.
- **الحل الموصى به:**
  - حذف مساري `convert` و `updateStatus` من `routes/api.php` تماماً (خاصة أن `AbandonedCartResource.php` ينفذ التحويل وتغيير الحالة داخلياً أصلاً من Livewire/Filament!).
  - ربط `POST /api/abandoned-cart` و `DELETE /api/abandoned-cart/{phone}` بالعميل المصادق أو بتوكن جلسة مع Rate Limiting.

---

### 🔴 C-05: ثغرة Stored XSS في لوحة تحكم Filament (عرض تفاصيل الطلب)
- **الموقع:** `app/Filament/Resources/OrderResource.php` (`109-117`).
- **التفاصيل:**
  ```php
  return <<<HTML
      <span style="font-family:monospace;font-size:13px;font-weight:700">{$state}</span><br>
      <svg id="{$svgId}" data-sku="{$state}" style="margin-top:4px;display:block"></svg>
  HTML;
  ```
  مع `->html()` دون استخدام `e($state)` للهروب من HTML! وبما أن مصفوفة `items` (بما فيها `sku`) يمكن إدخالها عبر `POST /api/orders/track` (المتاح بدون مصادقة)، يمكن حقن كود HTML/JS ينفَّذ داخل جلسة مدير المتجر فور فتح صفحة الطلب.
- **الحل الموصى به:** تغليف القيمة بـ `$escaped = e($state);` قبل إدراجها في الـ HTML، وتقييد حقل `sku` بالتحقق الصارم عند الإدخال.

---

### 🔴 C-06: تجاوز رسوم التوصيل والحد الأدنى للطلب وحدود الكميات (Client-Side Trust)
- **المواقع:**
  - `app/Http/Controllers/Api/OrderController.php` (`37`, `98`): يعتمد `$request->delivery_fee` مباشرةً (`min:0`).
  - `app/Http/Controllers/Api/CustomerController.php` (`324`, `417`): يعتمد `$request->input('shipping_lines.0.total') ?? 0` مباشرةً.
  - عدم وجود أي فحص في السيرفر لـ `DeliveryZone`، `AppSetting::min_order_value`، `AppSetting::default_max_qty`، و `ProductQtyLimit`.
- **الأثر:** يمكن لأي عميل معدل للطلب إرسال `delivery_fee = 0` للحصول على توصيل مجاني دائماً، أو تجاوز `min_order_value`، أو طلب كميات أكبر من `ProductQtyLimit` (بل وتكرار نفس `product_id` في أكثر من عنصر داخل `line_items` لتجاوز حد `max:50`!).
- **الحل الموصى به:** إنشاء خدمة `CheckoutPricingService` في Laravel تقوم بحساب:
  1. تجميع الكميات حسب `product_id` وفحصها ضد `ProductQtyLimit` و `default_max_qty`.
  2. فحص `subtotal >= min_order_value`.
  3. حساب `delivery_fee` بالكامل في السيرفر بناءً على `DeliveryZone` (المدينة)، إحداثيات القرب من الفرع (`free_delivery_near_branch` عبر مسافة Haversine)، وحد الشحن المجاني (`free_threshold`).

---

### 🔴 C-07: الكوبونات ذات الاستخدام الواحد يمكن استخدامها إلى ما لا نهاية مع PayMob
- **الموقع:** `app/Http/Controllers/Api/OrderController.php` (`358-364`).
- **التفاصيل:** عند إنشاء طلب PayMob في WooCommerce (`createWooOrder`)، يتم إرسال خصم الكوبون كـ `fee_lines` سالب باسم `'خصم الكوبون'` بدلاً من إرساله ضمن `coupon_lines`!
- **الأثر:** WooCommerce **لا يسجل استخدام الكوبون أبداً ولا يزيد `usage_count`**، مما يسمح بإعادة استخدام كوبونات `usage_limit: 1` (بما فيها كوبونات الترحيب) عدداً لا محدوداً من المرات في طلبات البطاقة!
- **الحل الموصى به:** إرسال `coupon_lines => [['code' => $order->coupon_code]]` إلى WooCommerce (وحفظ `coupon_code` في جدول `orders`) بدلاً من `fee_lines`، ومزامنة احتساب الضريبة والخصم بشكل موحد.

---

### 🔴 C-08: إساءة استخدام هدية الترحيب وكوبون الترحيب بلا قيود حقيقية
- **المواقع:**
  1. `app/Http/Controllers/Api/CustomerController.php` (`402-405`): أي عميل (حتى لو لديه 100 طلب سابق!) يضيف `welcome_offer_gift_product_id` بكمية `1` يحصل عليه بسعر `0.00` ر.س في كل طلب!
  2. `app/Http/Controllers/Api/CustomerController.php` (`720-792` — `POST /api/welcome-offer/generate-coupon`):
     - بدون مصادقة وبدون تحقق من أن الرقم لم يطلب سابقاً (`hasOrders`) وبدون تحقق من صحة صيغة الجوال السعودي (`^05\d{8}$`).
     - يمكن توليد كوبونات خصم حقيقية بلا حدود باستخدام أرقام عشوائية وهمية، ثم استخدامها على أي طلب.
     - عند تكرار الرقم (السطر `742` و `774`)، يعيد السيرفر `code` الخاص بصاحب الرقم في استجابة `409` لأي مستعلم!
- **الحل الموصى به:**
  - التحقق من استحقاق العرض الترحيبي (عميل مصادق عبر OTP + لا توجد له طلبات سابقة + لم يستفد من `WelcomeOfferClaim` مسبقاً).
  - تسجيل استخدام هدية الترحيب في `welcome_offer_claims` وعدم منحها مجاناً لأكثر من مرة.
  - عدم إرجاع `coupon_code` للغير في استجابة `409` دون مصادقة صاحب الرقم.

---

### 🔴 C-09: ثغرة تسعير المنتجات غير المنشورة / النافدة / ذات السعر الفارغ
- **الموقع:** `app/Services/WooCommerceService.php` (`203-240`) + `app/Http/Controllers/Api/WooProxyController.php` (`56-62`).
- **التفاصيل:**
  - `getProductsPricing()` لا تتحقق من `status === 'publish'` أو `purchasable === true` أو `stock_status === 'instock'`، كما أنها تحوّل السعر الفارغ إلى `(float) 0` وتخزّنه في الكاش لمدة 24 ساعة!
  - `WooProxyController::product(int $id)` لا تتحقق من `status === 'publish'`، مما يسمح بالاطلاع على المنتجات المسودة (Draft) والخاصة (Private) عبر رقمها.
- **الحل الموصى به:** رفض أي منتج حالته ليست `publish` أو غير `purchasable` أو `outofstock` أو سعره `<= 0` في `getProductsPricing()`، وتصفية المنتجات غير المنشورة في `WooProxyController::product()`.

---

### 🔴 C-10: التلاعب بمسارات تتبع الطلبات والإشعارات (`track` / `markPaid` / `fcm-token`)
- **المواقع:**
  1. `app/Http/Controllers/Api/OrderController.php` (`527-555` — `PATCH /api/orders/track/{wooOrderId}/paid`): بدون مصادقة؛ يسمح السطر `550` بربط أي طلب ضيف مدفوع بأي `customer_id` يختاره المرسل (`updateOrderCustomer`)، مما يتيح سرقة تاريخ طلبات الآخرين.
  2. `app/Http/Controllers/Api/OrderController.php` (`418-516` — `POST /api/orders/track`): بدون مصادقة؛ أي شخص يخمّن رقم `woo_order_id` وإجماليه (بهامش ±1 ريال) يستطيع الكتابة فوق بيانات العميل (`customer_name`, `address`, `items`, `notes`, `wallet_amount`) في السجل المحلي للطلب!
  3. `app/Http/Controllers/Api/CustomerController.php` (`240-253` — `POST /api/fcm-token`): بدون مصادقة؛ يمكن استبدال `fcm_token` الخاص بأي رقم جوال لاستلام إشعارات الضحية (تحديثات المحفظة والاسترجاع والطلبات).
  4. `app/Http/Controllers/Api/CustomerController.php` (`275`, `515`): قبول `meta_data` مفتوحة من العميل وإرسالها مباشرة إلى WooCommerce دون قائمة بيضاء (Allowlist) للمفاتيح المسموحة.
- **الحل الموصى به:**
  - إلغاء قبول `customer_id` غير المصادق في `markPaid` (اعتماد `verifiedCustomerId` فقط).
  - في `track`: قصر تحديث الطلبات على الحالات الموثوقة أو الاعتماد على `WooWebhookController` الموقّع كمصدر وحيد، وعدم السماح بالكتابة فوق طلب موجود مسبقاً.
  - ربط `saveFcmToken` بالمستخدم المصادق (أو توكن OTP موثق) وتوحيد صيغة رقم الجوال قبل الحفظ.
  - فرض قائمة بيضاء صارمة لمفاتيح `meta_data` المسموحة (مثل مفاتيح attribution فقط).

---

### 🟠 H-01: غياب كامل للـ Rate Limiting (الحماية من الإغراق وقصف SMS)
- **الموقع:** `routes/api.php` بالكامل (لا يوجد أي `throttle` middleware على أي مسار!).
- **التفاصيل:**
  - `POST /api/otp/send`: يوجد حدّ (طلبان في الدقيقة لكل رقم جوال)، لكن **لا يوجد أي حد لكل IP** ولا حد يومي لكل رقم! يمكن لمهاجم إرسال آلاف رسائل SMS لأرقام سعودية عشوائية لاستنزاف رصيد بوابة Connect Saudi بالكامل، أو إرسال 2,880 رسالة يومياً لضحية واحدة.
  - `POST /api/auth/login` و `POST /api/otp/verify` و `GET /api/customers/find` و `POST /api/customers` و `POST /api/welcome-offer/generate-coupon` و `POST /api/app-installs`: كلها مفتوحة بدون أي `throttle`.
- **الحل الموصى به:** تعريف Rate Limiters مخصصة في `AppServiceProvider` (مثلاً: `otp-send` بحد لكل IP + لكل رقم + حد يومي، `login` بحد 5 محاولات/دقيقة، `api` عام بحد 60–120 طلب/دقيقة).

---

### 🟠 H-02: ثغرات Webhooks (Fail-Open والتحقق الناقص من المبالغ والسر)
- **المواقع:**
  1. `app/Http/Controllers/Api/WooWebhookController.php` (`21-29`): الشرط `if ($secret)` يعني أنه إذا لم يُضبط `WC_WEBHOOK_SECRET` في `.env` (وهو **مفقود فعلاً من `.env.example`**!)، فإن السيرفر يقبل أي طلب webhook مزوّر بدون توقيع!
  2. `app/Http/Controllers/Api/PaymentController.php` (`281`): إذا كان `PAYMOB_HMAC_SECRET` فارغاً (`null`/فارغ)، فإن `hash_hmac` يحسب توقيعاً بمفتاح فارغ بدلاً من الرفض الفوري.
  3. `app/Http/Controllers/Api/PaymentController.php` (`42-120` و `216-249`): **لا يتحقق أبداً** من تطابق `$obj['amount_cents']` و `$obj['currency']` مع `$payment->amount` (أو `$topup->amount`) و `$payment->currency` قبل اعتماد الدفع أو شحن المحفظة!
  4. `app/Http/Controllers/Api/PaymentController.php` (`27`): يسجل كامل جسم الـ Webhook في ملف الـ Log (بما فيه بيانات العميل والبطاقة المقنّعة والـ HMAC).
- **الحل الموصى به:**
  - تطبيق مبدأ **Fail-Closed**: إذا كان `WC_WEBHOOK_SECRET` أو `PAYMOB_HMAC_SECRET` فارغاً يُرفض الطلب فوراً بـ `500/401`.
  - التحقق الصارم من `(int) ($obj['amount_cents'] ?? 0) === (int) round($record->amount * 100)` ومن تطابق العملة `SAR`.
  - تسجيل الحقول التشخيصية غير الحساسة فقط (مثل `order_id`, `transaction_id`, `success`, `pending`, `amount_cents`).

---

### 🟠 H-03: ضعف تصميم التوكنات ورموز OTP (Plaintext + بدون انتهاء صلاحية)
- **المواقع:**
  - `app/Models/CustomerAuthToken.php` (`16-36`): التوكنات مخزّنة **بنص صريح (Plaintext)** في الجدول (وليس `hash('sha256', $token)` كما تفعل Sanctum)، **ولا تنتهي صلاحيتها أبداً**، ولا يوجد Endpoint لتسجيل الخروج أو إلغاء التوكنات!
  - `app/Http/Controllers/Api/Concerns/AuthorizesCustomer.php` (`57-66`): في `authorizeCustomerLenient`، إذا أرسل العميل توكن **مزوّر/غير موجود** (`$resolvedId === null`) فإن الشرط `if ($resolvedId !== null && ...)` يتجاهله ويسمح بمرور الطلب بدلاً من إرجاع `401` (بعكس `authorizeCustomerPhoneLenient`!).
  - `app/Http/Controllers/Api/OtpController.php` (`75-83`) + `app/Filament/Resources/PhoneOtpResource.php` + `app/Filament/Exports/PhoneOtpExporter.php`:
    - رمز OTP مكوّن من 4 أرقام فقط (`1000-9999`) ومخزن **بنص صريح** في قاعدة البيانات.
    - لوحة Filament تعرض كل رموز OTP النشطة وتسمح بتصديرها كملف Excel لأي مستخدم في جدول `users`!
- **الحل الموصى به:**
  - تخزين `hash('sha256', $token)` في `customer_auth_tokens` مع عمود `expires_at` (مثلاً 30–90 يوماً) وإضافة مسار `POST /api/auth/logout` (أو الانتقال الكامل إلى Laravel Sanctum المثبتة أصلاً).
  - تصحيح `authorizeCustomerLenient` لرفض التوكن غير الصالح بـ `401`.
  - ترقية OTP إلى 6 أرقام وتخزينه مجزّأً (`Hash::make` أو `HMAC-SHA256`) وحذف `PhoneOtpResource` و `PhoneOtpExporter` من بيئة الإنتاج فور تفعيل SMS.

---

### 🟠 H-04: مخاطر أمان الاتصال والأدوار والإعدادات (`OriginHttp` / `User` / `CORS` / `Seeder`)
- **المواقع:**
  1. `app/Support/OriginHttp.php` (`100` و `152-171`):
     - يعطل التحقق من شهادة SSL (`CURLOPT_SSL_VERIFYPEER => false`).
     - عند التحول إلى `shellRequest`، يمرر مفاتيح WooCommerce (`-u`) و `X-Wallet-Secret` (`-H`) وبيانات JSON (بما فيها **كلمات مرور العملاء** في `login`/`createCustomer`!) ضمن وسائط سطر الأوامر (Command-line arguments) التي تكون مرئية في عمليات النظام (`/proc/<pid>/cmdline`). كما يمرر `WooCommerceService` مفاتيح `consumer_key` و `consumer_secret` في رابط الاستعلام (Query String).
  2. `app/Models/User.php` (`21-24`): `canAccessPanel()` يعيد `true` دائماً لكل مستخدم، دون نظام أدوار وصلاحيات (RBAC) بين مدير عام وموظف طلبات وموظف محتوى.
  3. `database/seeders/AdminUserSeeder.php` (`19`): كلمة مرور افتراضية ضعيفة مكتوبة صراحةً في الكود (`admin123`).
  4. غياب `config/cors.php` (الافتراضي في Laravel يسمح بـ `*` لكل المصادر)، وغياب `SESSION_SECURE_COOKIE=true` في `.env.example`.
- **الحل الموصى به:**
  - إزالة `CURLOPT_SSL_VERIFYPEER => false`، وتمرير الترويسات والبيانات إلى `curl` عبر `proc_open` (`stdin` مع `--config -` و `--data-binary @-`) بدلاً من `shell_exec` ووسائط الأوامر، واستخدام Basic Auth Header بدلاً من Query String.
  - إضافة صلاحيات/أدوار لـ Filament وتقييد `canAccessPanel`.
  - إزالة كلمة المرور الثابتة من `AdminUserSeeder` وقراءتها من متغير بيئة.
  - نشر `config/cors.php` وتقييد `allowed_origins` بنطاقاتك فقط، وتفعيل `SESSION_SECURE_COOKIE=true`.

---

## 3. أخطاء برمجية فعلية وحالات تزامن خطيرة (Critical Bugs & Race Conditions)

### 🔴 B-01: خطأ قاتل (Fatal Error) يوقف توليد كوبون الترحيب تماماً
- **الموقع:** `app/Http/Controllers/Api/CustomerController.php` (`778-779`) + `app/Support/OriginHttpResponse.php`.
- **التفاصيل:** السطر `779` يستدعي `if ($res->failed())` على كائن من نوع `OriginHttpResponse`، لكن كلاس `OriginHttpResponse` **لا يحتوي على دالة `failed()` إطلاقاً** (يحتوي فقط على `successful()`, `status()`, `body()`, `json()`).
- **الأثر:** كل استدعاء ناجح للمسار `POST /api/welcome-offer/generate-coupon` ينهار فوراً بخطأ `Call to undefined method App\Support\OriginHttpResponse::failed()` (HTTP 500) بعد أن يكون قد حجز السجل في `welcome_offer_claims` وأنشأ الكوبون في WooCommerce!
- **الحل:** إضافة `public function failed(): bool { return !$this->successful(); }` إلى `OriginHttpResponse` أو استبدالها بـ `if (!$res->successful())`.

---

### 🔴 B-02: خصم المحفظة في `CustomerController::createOrder` يستخدم `Http::` بدلاً من `OriginHttp`
- **الموقع:** `app/Http/Controllers/Api/CustomerController.php` (`567`).
- **التفاصيل:** بينما يذكر نفس الملف (السطور `26-31`) أن استدعاءات `Http::` (Guzzle) بين Laravel و WooCommerce على نفس السيرفر تحصل على `403` من حماية الاستضافة، فإن السطر `567` يستدعي `Http::withHeaders($this->walletHeaders())->post(...)` مباشرةً (وبدون `timeout`!) بدلاً من `$this->httpClient()->withHeaders(...)`.
- **الأثر:** فشل طلبات الدفع بالمحفظة على الإنتاج عند تفعيل طبقة الحماية، أو تعليق الاتصال بلا مهلة.
- **الحل:** استبدال `Http::` بـ `$this->httpClient()->withHeaders($this->walletHeaders())->post(...)` (أو دالة موحدة `debitWalletServerSide()` في `WooCommerceService`).

---

### 🔴 B-03: حالات تزامن (Race Conditions) تسبب شحن مزدوج أو خصم مزدوج للمحفظة
- **المواقع:**
  1. `app/Http/Controllers/Api/PaymentController.php` (`216-249` — `handleWalletTopup`): لا يوجد `DB::transaction` مع `lockForUpdate()`. إذا أرسلت PayMob إشعارَي Webhook متزامنين لنفس الشحنة، يمر كلاهما من `if ($topup->paymob_transaction_id)` ويتم **شحن محفظة العميل مرتين**!
  2. `app/Http/Controllers/Api/PaymentController.php` (`73-121` — `handleOrderPayment`): نفس غياب القفل؛ Webhook متزامن قد يخصم المحفظة مرتين في `debitOrderWallet()` أو يرسل إشعارات استرجاع مكررة في `handleRefundIfAny()`.
  3. `app/Http/Controllers/Api/CustomerController.php` (`451-456` و `566-581`): طلبان متزامنان من نفس العميل (بدون أو بمفتاحي `idempotency_key` مختلفين) يقرآن نفس `$realBalance` قبل الخصم؛ كما أن فحص `idempotency_key` في السطر `339` ثم الإنشاء في `553` غير محمي بـ Transaction أو التقاط `UniqueConstraintViolationException`.
  4. `app/Http/Controllers/Api/CustomerController.php` (`177-210` — `walletCredit`): فحص `exists()` ثم `create()` بدون معالجة استثناء التكرار `QueryException` في طبقة قاعدة البيانات.
  5. `app/Http/Controllers/Api/OtpController.php` (`105-122` و `170`, `215`): التحقق من `attempts < 5` وتحديث `consumed_at` بدون قفل ذرّي يتيح تجاوز حد المحاولات أو استهلاك نفس الـ OTP مرتين بالتوازي.
  6. `app/Http/Controllers/Api/WooWebhookController.php` (`139-147`): قد يرسل حدث `PURCHASE` مكرراً إلى Snapchat عند تزامن Webhookين.
  7. `app/Http/Controllers/Api/AppInstallController.php` (`30-46`): فحص ثم إدراج على `device_id` الفريد يسبب خطأ `500` عند استدعاء التطبيق للمسار مرتين متزامنتين وقت التشغيل.
- **الحل الموصى به:** استخدام `DB::transaction()` مع `->lockForUpdate()` في معالجات الدفع والشحن والـ OTP، واستخدام `Cache::lock("wallet_customer_{$customerId}", 15)` حول عمليات المحفظة، واستخدام `upsert()` في `AppInstallController`، والتقاط `UniqueConstraintViolationException` في `idempotency_key` و `walletCredit`.

---

### 🔴 B-04: خلل منطقي في تذكير السلال المهجورة (`created_at` بدل `updated_at`)
- **الموقع:** `app/Console/Commands/RemindAbandonedCarts.php` (`20-23`) + `app/Http/Controllers/Api/AbandonedCartController.php` (`23-35`).
- **التفاصيل:** عند تحديث سلة عميل موجود مسبقاً عبر `updateOrCreate(['phone' => ...])`، يُعاد ضبط `reminded_at = null` ويتحدث `updated_at` فقط بينما يبقى `created_at` قديماً (من قبل أيام أو أسابيع!). لكن الأمر `RemindAbandonedCarts` يفحص `where('created_at', '<=', now()->subMinutes(30))`!
- **الأثر:** بمجرد أن يضيف عميل سابق منتجاً للسلة، يصله إشعار ورسالة واتساب "نسيت شيء في سلتك" خلال **0 إلى 5 دقائق** وهو ما زال يتسوق فعلياً!
- **الحل:** تغيير الشرط إلى `->where('updated_at', '<=', now()->subMinutes(30))` وإضافة `->withoutOverlapping()` في `routes/console.php`.

---

### 🟠 B-05: تعارض حاد في ترجمة حالات الطلبات (تدمير الحالات عند المزامنة)
- **الموقع:** `app/Filament/Resources/OrderResource/Pages/ListOrders.php` (`82-89`) مقابل `WooWebhookController.php` (`63-72`) و `OrderController.php` (`474-482`).
- **التفاصيل:**
  - `WooWebhookController` و `OrderController::track`: يحولان `processing → paid` و `completed → delivered` و `failed → failed`.
  - زر **"مزامنة من WooCommerce"** في `ListOrders.php` يحول `processing → pending` و `completed → shipped` و `failed → pending`!
  - `CustomerController::createOrder` (السطر `604`) يحفظ طلب الدفع عند الاستلام محلياً كـ `pending` بينما ينشئه في WooCommerce كـ `processing`.
- **الأثر:** الضغط على زر المزامنة في لوحة التحكم يحوّل كل الطلبات المدفوعة (`paid`) إلى `pending` ويفسد تقارير الإيرادات!
- **الحل:** إنشاء Enum أو Helper موحّد (`OrderStatus::fromWoo(string $wooStatus)`) يُستخدم في كل مكان بلا استثناء.

---

### 🟠 B-06: خلل حساب الإيرادات والمبلغ المتبقي في لوحة التحكم والفاتورة
- **المواقع:**
  1. `app/Filament/Widgets/StatsOverview.php` (`13-15`): يحسب الإيرادات والطلبات المدفوعة عبر `where('status', 'paid')` فقط! وبمجرد اكتمال الطلب (`delivered`) يختفي مبلغه بالكامل من "إجمالي الإيرادات"!
  2. `app/Filament/Resources/OrderResource.php` (`53`) + `resources/views/orders/print.blade.php` (`198-200`):
     - في `OrderController::create` (`121`)، يُخزَّن `total` **بعد خصم المحفظة** (`subtotal + delivery - discount - wallet`).
     - في `CustomerController::createOrder` (`469`)، يُخزَّن `total` **قبل خصم المحفظة** (`subtotal + delivery - discount + cod_fee`).
     - النتيجة: `OrderResource` يخصم `wallet_amount` مرتين في طلبات البطاقة+المحفظة، والفاتورة المطبوعة تعرض أرقاماً متناقضة بين مساري الدفع!
  3. `app/Http/Controllers/Api/WooWebhookController.php` (`121`): يبحث فقط عن `'دفع بالمحفظة'` ويتجاهل `'خصم المحفظة'` التي يرسلها `OrderController::createWooOrder` (السطر `367`).
- **الحل:** توحيد معنى `orders.total` في كل النظام (إجمالي الفاتورة قبل توزيع وسيلة الدفع، أو عمود منفصل `amount_due`)، وتضمين الحالات `['paid', 'confirmed', 'shipped', 'delivered']` في `StatsOverview`، وتوحيد اسم رسوم المحفظة.

---

### 🟠 B-07: ثغرات منطقية في مسار دفع PayMob (الطلب المدفوع اليتيم والمحاولات المتعددة)
- **الموقع:** `app/Http/Controllers/Api/PaymentController.php` (`109-118` و `292-299`).
- **التفاصيل:**
  1. إذا فشل `OrderController::createWooOrder()` وقت إنشاء الطلب (وبقي `woo_order_id = null`) ثم دفع العميل بنجاح، فإن `syncWooOrderStatus` تكتفي بتسجيل Warning وتعود دون إنشاء الطلب في WooCommerce (رغم أن التعليق في السطر `288` يدعي أنها تنشئه!). النتيجة: عميل دفع ماله وطلبه غير موجود في WooCommerce!
  2. إذا أعاد العميل المحاولة (`respondForExistingOrder` أنشأت صف `Payment` جديداً) ونجح الثاني ثم وصل Webhook فشل متأخر للـ `Payment` الأول، فإن السطر `116` سيغيّر حالة الطلب من `paid` إلى `failed` ويلغيه في WooCommerce!
- **الحل:**
  - إذا كان `$order->woo_order_id` فارغاً عند نجاح الدفع، تنفيذ إنشاء الطلب في WooCommerce (عبر خدمة مشتركة مع Job للمحاولة عند الفشل).
  - عدم السماح لـ Webhook فاشل بتغيير حالة طلب وصل بالفعل إلى `paid` / `delivered`.

---

### 🟠 B-08: أخطاء في الخدمات المساندة والنشر (`Snapchat`, `SmsService`, `deploy.sh`, `SQLite`)
- **المواقع:**
  1. `app/Services/SnapchatConversionsService.php` (`60`, `81-82`):
     - لا يوجد `try/catch` حول `Http::post`؛ أي Timeout من Snapchat يتسبب بانهيار `WooWebhookController` (HTTP 500).
     - `hashPhone()` لا تزيل بادئة `00966` (لأنها تبدأ بـ `0` فتحولها إلى `+96609665...`!).
     - تمرير `access_token` في رابط Query String بدلاً من الهيدر `Authorization: Bearer`.
  2. `app/Http/Controllers/Api/OtpController.php` (`88-93`): يتجاهل القيمة المرجعة (`bool`) من `SmsService::send()` ويرجع `200 {"ok": true}` حتى لو فشل الإرسال فعلياً!
  3. `routes/web.php` (`7-9`) + `deploy.sh` (`30`): المسار `/` يستخدم Closure (`function () { return view('welcome'); }`) مما يجعل `php artisan route:cache` في `deploy.sh` يفشل ويوقف النشر (`set -e`)! استبدله بـ `Route::view('/', 'welcome');`.
  4. `routes/api.php` (`39-44`): تعريف مكرر تماماً لمساري `POST /otp/send` و `POST /otp/verify`.
  5. `app/Filament/Resources/OrderResource.php` (`221`): يستخدم `CAST(woo_order_id AS UNSIGNED)` الخاصة بـ MySQL فقط (تتعطل على SQLite).
  6. `app/Models/Order.php` (`28`) و `resources/views/orders/print.blade.php` (`104`): يعتمدان على عمود `delivery_status` غير موجود في أي Migration!

---

## 4. العمليات التي تحتاج تحسين في الأداء وقاعدة البيانات والكاش (Performance & DB)

### 🟡 P-01: غياب الكاش في بوابة WooCommerce Proxy واستنزاف المعالج
- **الموقع:** `app/Http/Controllers/Api/WooProxyController.php` بالكامل.
- **المشكلة:**
  - `GET /api/products` و `GET /api/products/{id}` و `GET /api/categories` و fallback `GET /api/brands` **بدون أي Cache**!
  - `categories()` تنفذ حلقة `do...while` متزامنة تجلب 100 تصنيف في كل طلب HTTP إلى WooCommerce مع كل فتح للتطبيق!
  - `WooCommerceService::getBrandLabels()` (السطر `150`) و `getProductLabels()` (السطر `174`) بدون كاش (استعلامات N+1 في Filament).
  - `getProductsPricing()` و `getProductLabels()` تمرران `per_page => count($ids)` بينما حد WooCommerce الأقصى هو `100` (ينهار بـ HTTP 400 إن تجاوزت القائمة 100 منتج).
- **الحل:**
  - كاش `categories` لمدة 15–30 دقيقة، وكاش `products` (بمفتاح hash للمعاملات) لمدة 2–5 دقائق، وكاش `product/{id}` لمدة 5 دقائق مع إبطال عبر Webhook (أو زر مسح الكاش في Filament).
  - إضافة كاش يومي لـ `getBrandLabels` و `getProductLabels`، وتقسيم المصفوفات عبر `array_chunk($ids, 100)`.

---

### 🟡 P-02: تضخم استدعاءات الشبكة في `CustomerController::findByPhone`
- **الموقع:** `app/Http/Controllers/Api/CustomerController.php` (`89-144`).
- **المشكلة:** في أسوأ حالة (رقم غير موجود)، تنفذ الدالة **8 طلبات HTTP متسلسلة ومتزامنة** إلى WooCommerce (4 لـ `orders` + 4 لـ `customers`)!
- **الحل:** توحيد صيغ الأرقام عند التسجيل والبحث، والاستعلام ببحث واحد مختصر (أو endpoint مخصص على WordPress يبحث في MySQL مباشرةً بـ `RIGHT(phone, 9)` في استعلام واحد).

---

### 🟡 P-03: غياب الكاش لتوكن OAuth2 في `FcmService`
- **الموقع:** `app/Services/FcmService.php` (`93-119`).
- **المشكلة:** `getAccessToken()` يولّد JWT ويتصل بـ `https://oauth2.googleapis.com/token` في **كل إشعار Push واحد** (رغم أن التوكن صالح لساعة كاملة!)، كما لا توجد مهلة `timeout()` على طلبات HTTP لـ Google/FCM!
- **الحل:** تغليف الحصول على التوكن بـ `Cache::remember('fcm_oauth_access_token', 3300, ...)` وإضافة `->timeout(8)` لجميع طلبات `Http::`.

---

### 🟡 P-04: كتابة في قاعدة البيانات مع كل طلب API للقراءة فقط (`last_used_at`)
- **الموقع:** `app/Models/CustomerAuthToken.php` (`34`) و `AuthorizesCustomer.php` (`38`, `78`).
- **المشكلة:** كل استدعاء API مصادق (حتى GET) ينفذ `UPDATE customer_auth_tokens SET last_used_at = NOW()`، ما يرفع حمل الكتابة والأقفال (خصوصاً إذا استُخدم SQLite أو MySQL على استضافة مشتركة محدودة الـ CPU).
- **الحل:** تحديث `last_used_at` فقط إذا مضى أكثر من 15–60 دقيقة على آخر تحديث (`if (!$row->last_used_at || $row->last_used_at->lt(now()->subMinutes(15)))`).

---

### 🟡 P-05: غياب فهارس (Indexes) حيوية ونمو غير محدود للجداول
- **المواقع (Migrations):**
  - جدول `orders`: **لا يوجد فهرس أو قيد `unique` على `woo_order_id`** (مما يسمح بتكرار الطلب محلياً عند تزامن `track` و `webhook` ويبطئ البحث)، ولا فهارس على `status`, `created_at`, `customer_phone`, `woo_customer_id`, `attribution_media_source`.
  - جدول `abandoned_carts`: لا فهارس على `(status, reminded_at, updated_at)` رغم فحصه كل 5 دقائق.
  - جدول `phone_otps`: لا فهرس مركّب على `(phone, created_at)` أو `(phone, consumed_at, expires_at)` أو `ip_address`.
  - جدول `app_installs`: لا فهارس على `first_seen_at` أو `last_seen_at` أو `(platform, media_source)`.
  - **نمو غير محدود للبيانات:** لا توجد مهمة مجدولة (Pruning) لحذف السجلات القديمة في `phone_otps` و `customer_auth_tokens` المنتهية و `abandoned_carts` القديمة، ولا لتدوير ملف السجل (`LOG_STACK=single` في `.env.example`).
- **الحل:**
  - إضافة Migration للفهارس المفقودة وقيد `unique` على `orders.woo_order_id`.
  - إضافة `MassPrunable` وجدولة `model:prune` يومياً لتنظيف `phone_otps` (> 7 أيام) والتوكنات المنتهية.
  - تغيير `LOG_STACK=daily` مع `LOG_DAILY_DAYS=14`.

---

### 🟡 P-06: عمليات متزامنة بطيئة يجب نقلها إلى Queued Jobs + تحسينات الكرون واللوحة
- **المواقع:**
  1. `PaymentController` (إشعار FCM للاسترجاع، تحديث حالة WooCommerce)، `WooWebhookController` (إرسال حدث Snapchat)، `CustomerController::walletCredit` (إشعار FCM)، `RemindAbandonedCarts` (إرسال FCM + WhatsApp): كلها تعمل بشكل متزامن داخل الطلب أو حلقة بدون Chunking أو استعلام مسبق لرموز FCM (N+1 في `RemindAbandonedCarts:26`).
  2. `OtpController` (`160`, `205`) و `WooCommerceService` (`36`, `225`): استخدام `usleep(500_000)` يحجز عمليات PHP-FPM أثناء الانتظار.
  3. `AppInstallsOverview.php` (`13-19`): ينفذ **6 استعلامات** مسح كامل للجدول بدلاً من استعلام واحد مجمع (`SELECT SUM(CASE WHEN ...)`).
  4. `StatsOverview.php` (`13-16`): ينفذ **4 استعلامات** منفصلة يمكن دمجها في استعلام واحد وكاش لمدة 60 ثانية.
  5. `CleanActionScheduler.php` (`45`): تنفيذ `OPTIMIZE TABLE` على جداول الإنتاج يغلق الجدول أثناء إعادة البناء؛ ويفضل جدولة الأمر مع `->withoutOverlapping()`.
  6. **فجوة الكاش في الواجهة:** `HomeSectionController` و `BrowseSectionController` و `HomeDepartmentController` لا تستخدم أي كاش، بينما `app_config` لا يُمسح تلقائياً عند الإنشاء/التعديل من صفحات Filament (`Create*`/`Edit*`) أو `DeleteBulkAction` (فقط `Faq` تستخدم Model events، بينما `Banner`, `DeliveryZone`, `OfferPage`, `Policy`, `ProductQtyLimit` تعتمد على `table actions` فقط!).
  7. **اختناق DB Drivers:** ضبط `CACHE_STORE=database` و `SESSION_DRIVER=database` و `QUEUE_CONNECTION=database` معاً يضغط على قاعدة البيانات (وخاصة SQLite دون `WAL` و `busy_timeout`). في الاستضافة المشتركة يُفضل `file` أو `redis` للجلسات والكاش عند غياب Redis.
- **الحل:**
  - نقل الإشعارات و Snapchat ومزامنة WooCommerce غير الحرجة إلى Queued Jobs مع Retry/Backoff.
  - ربط مسح كاش `app_config` و `home_sections` و `browse_sections` و `home_departments` بـ Model Observers (`saved` و `deleted`).
  - استخدام `chunkById(100)` وجلب `customer_fcm_tokens` باستعلام `whereIn` واحد في `RemindAbandonedCarts`.

---

## 5. تحسينات البنية البرمجية وجودة الكود والنشر (Architecture & DevOps)

### 🔵 A-01: تكرار الكود وتضخم المتحكمات (Fat Controllers)
- **`CustomerController` (793 سطراً)** و **`OrderController` (556 سطراً)** يجمعان بين: التحقق من المدخلات، المصادقة، حساب الأسعار، خصم المحفظة، التواصل مع WooCommerce، التواصل مع PayMob، والتتبع المحلي.
- **تكرار توحيد رقم الجوال (`normalizePhone`) في 5 أماكن مختلفة بمنطق غير متطابق!** (`OtpController`, `CustomerController::findByPhone`, `CustomerController::generateWelcomeCoupon`, `SmsService`/`WhatsAppService`, `SnapchatConversionsService`, `AuthorizesCustomer`) — بينما `AddressController`, `AbandonedCartController`, و `saveFcmToken` لا توحد الرقم أصلاً، مما يسبب فشل مطابقة الإشعارات (`customer_fcm_tokens`) والعناوين!
- **تكرار إعداد عميل WooCommerce** في 6 ملفات مختلفة (`WooCommerceService`, `CustomerController`, `OrderController`, `WooProxyController`, `OtpController`, `AbandonedCartController`, `ListOrders`, `ListBrandSettings`).
- **تكرار منطق تحويل السلة المهجورة** بين `AbandonedCartController::convertToOrder()` و `AbandonedCartResource::table()`.
- **التوصية:**
  - إنشاء `App\Support\PhoneNormalizer` (توحيد إلى `05XXXXXXXX` و `9665XXXXXXXX` و `+9665XXXXXXXX`).
  - حصر كل اتصالات WooCommerce داخل `WooCommerceService` (وإنشاء `PaymobService` مستقل).
  - فصل التحقق في `FormRequest` classes ومنطق التسعير والطلب في `CheckoutService` / `DeliveryFeeCalculator`.

---

### 🔵 A-02: غياب كامل للاختبارات الآلية (0% Test Coverage)
- **الموقع:** مجلد `tests/` يحتوي فقط على `ExampleTest.php` الافتراضي.
- **التوصية:** إضافة Feature Tests تغطي المسارات الحساسة بالدرجة الأولى:
  - مصادقة التوكن ومنع IDOR في الطلبات والمحفظة والعناوين والفواتير.
  - حساب السعر والتوصيل والخصم والحدود في السيرفر (Checkout).
  - استقرار و Idempotency الـ Webhooks (PayMob و WooCommerce) ضد التكرار والتزوير.
  - تدفق OTP والـ Rate Limiting.

---

### 🔵 A-03: نواقص بيئة التشغيل والنشر (`.env.example` / `deploy.sh` / Filament)
- **`.env.example`**: ينقصه أكثر من 12 متغيراً أساسياً يعتمد عليها الكود (`WC_WEBHOOK_SECRET`, `WALLET_SECRET`, `CONNECTSAUDI_*`, `WHATSAPP_*`, `FIREBASE_*`, `WC_DB_*`, `SESSION_SECURE_COOKIE`).
- **`deploy.sh`**:
  - يفشل عند `php artisan route:cache` بسبب Closure في `routes/web.php`.
  - لا يشغّل `php artisan view:cache`، `php artisan event:cache`، `php artisan filament:optimize`، `php artisan storage:link`، أو `php artisan queue:restart`.
- **`ListBrandSettings.php`**: مزامنة البراندات تجلب أول 100 براند فقط (صفحة 1 بلا Pagination) وتكتبها بدون `DB::transaction`.

---

## 6. خطة التنفيذ المقترحة حسب الأولوية (Remediation Roadmap)

### المرحلة 1 — فوري وعاجل (خلال 24–48 ساعة)
1. **إغلاق الثغرات المالية والبيانات الحرجة:**
   - إضافة `verifiedCustomerId()` في `OrderController::create()` ومنع سرقة المحفظة.
   - إضافة `middleware('auth')` لمساري طباعة الفواتير في `routes/web.php`.
   - حذف مساري `abandoned-cart/{cart}/convert` و `status` من `routes/api.php`.
   - تقييد `GET /api/orders` و `GET /api/customers/{id}` و `GET /api/customers/find` و `PATCH /api/orders/track/{id}/paid`.
   - إصلاح ثغرة XSS في `OrderResource.php:109-117` باستخدام `e($state)`.
2. **إصلاح الأعطال الفعلية في الإنتاج:**
   - إضافة `failed()` في `OriginHttpResponse.php` (إصلاح تعطل `generateWelcomeCoupon`).
   - استبدال `Http::` بـ `OriginHttp` في `CustomerController.php:567`.
   - فرض Fail-Closed على `WC_WEBHOOK_SECRET` و `PAYMOB_HMAC_SECRET` والتحقق من `amount_cents` و `currency` في `PaymentController`.
   - إصلاح `ListOrders.php` (توحيد حالات الطلبات) و `StatsOverview.php` (حساب إيرادات `delivered`).
   - إصلاح `RemindAbandonedCarts.php` (`updated_at` بدلاً من `created_at`).
   - حذف المسارين المكررين في `routes/api.php` واستبدال Closure في `routes/web.php` بـ `Route::view`.

### المرحلة 2 — خلال أسبوع
1. **حماية التزامن والـ Rate Limiting:**
   - إضافة `DB::transaction` + `lockForUpdate()` في `PaymentController` و `OtpController` و `CustomerController`.
   - تفعيل `throttle` على كل مسارات `api.php` (وخاصة `otp/send` لكل IP + حد يومي).
2. **حماية منطق التسعير والعروض:**
   - احتساب `delivery_fee` وفحص `min_order_value` و `ProductQtyLimit` و `stock_status`/`publish` في السيرفر.
   - إرسال `coupon_lines` الحقيقية في `OrderController::createWooOrder` وإصلاح شروط هدية وكوبون الترحيب.
   - توحيد تعريف `orders.total` وإضافة Fallback إنشاء طلب WooCommerce عند غياب `woo_order_id` في Webhook.
3. **أمان المصادقة:**
   - تجزئة `CustomerAuthToken` وإضافة `expires_at` ومسار `logout`، وإغلاق ثغرة `authorizeCustomerLenient`، وتجزئة OTPs وإزالة `PhoneOtpResource`/`PhoneOtpExporter` من الإنتاج.

### المرحلة 3 — خلال أسبوعين
1. **تحسين الأداء وقاعدة البيانات:**
   - إضافة الفهارس المفقودة + قيد `unique` على `orders.woo_order_id` + `model:prune`.
   - كاش `WooProxyController` و `FcmService::getAccessToken` و `HomeSection`/`BrowseSection`/`HomeDepartment` مع Model Observers لإبطال الكاش.
   - تقليل تحديثات `last_used_at` وتحويل الإشعارات و Snapchat إلى Queued Jobs.
   - توحيد `PhoneNormalizer` وإصلاح `SnapchatConversionsService::hashPhone` + `try/catch`.

### المرحلة 4 — تحسين مستمر
1. تفكيك `CustomerController` و `OrderController` إلى Services و FormRequests.
2. إضافة نظام صلاحيات (RBAC) للوحة Filament وتأمين `OriginHttp` (`SSL_VERIFYPEER` + `proc_open`).
3. بناء مجموعة Feature Tests تغطي الدفع، المحفظة، الـ Webhooks، والصلاحيات.
4. تحديث `.env.example` و `deploy.sh` وتفعيل `LOG_STACK=daily` و `SESSION_SECURE_COOKIE=true`.
