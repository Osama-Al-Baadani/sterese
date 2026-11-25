<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>طلب رقم #{{ $order->woo_order_id ?? $order->id }}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; direction: rtl; }

  .page { max-width: 800px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px; }
  .logo-area h1 { font-size: 22px; font-weight: 700; color: #f59e0b; }
  .logo-area p { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .order-meta { text-align: left; }
  .order-meta .order-num { font-size: 18px; font-weight: 700; color: #111; }
  .order-meta .order-date { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 6px; }
  .status-paid    { background: #dcfce7; color: #166534; }
  .status-pending { background: #fef9c3; color: #854d0e; }
  .status-failed  { background: #fee2e2; color: #991b1b; }

  /* Sections */
  .section { margin-bottom: 18px; }
  .section-title { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }

  /* Info Grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .info-item label { font-size: 11px; color: #9ca3af; display: block; }
  .info-item span  { font-size: 13px; color: #111; font-weight: 500; }

  /* Products Table */
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f9fafb; padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  .product-img { width: 44px; height: 44px; object-fit: contain; border-radius: 6px; border: 1px solid #e5e7eb; }
  .product-name { font-weight: 600; color: #111; }
  .product-sku  { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .product-barcode { margin-top: 6px; }
  .product-barcode svg { max-width: 160px; height: 40px; }

  /* Totals */
  .totals { margin-top: 8px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totals-row.grand { font-size: 15px; font-weight: 700; border-top: 2px solid #f59e0b; padding-top: 8px; margin-top: 4px; }

  /* Footer */
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }

  /* Print */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 10px; }
  }

  /* Print Button */
  .print-btn { position: fixed; bottom: 24px; left: 24px; background: #f59e0b; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: inherit; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
  .print-btn:hover { background: #d97706; }
</style>
</head>
<body>
<div class="page">

  {{-- Header --}}
  <div class="header">
    <div class="logo-area">
      <h1>المخازن الاقتصادية</h1>
      <p>storeseco.com</p>
    </div>
    <div class="order-meta">
      <div class="order-num">طلب # {{ $order->woo_order_id ?? $order->id }}</div>
      <div class="order-date">{{ $order->created_at?->format('d/m/Y H:i') }}</div>
      @php
        $paymentMethodMap = [
          'cash_on_delivery' => 'الدفع عند الاستلام',
          'cod'              => 'دفع بالمحفظة الرقمية',
          'card'             => 'الدفع الإلكتروني (بطاقة)',
          'paymob'           => 'بطاقة عبر PayMob',
        ];
        $paymentMethodLabel = $paymentMethodMap[$order->payment_method] ?? ($order->payment_method ?: '—');
        $isCod = $order->payment_method === 'cash_on_delivery';

        // COD cash is only ever collected on delivery, so 'pending' here just
        // means "not yet collected" — it isn't a stalled/failed payment the
        // way the same status is for a card order, so it gets its own label
        // and a neutral color instead of reading like something went wrong.
        $payStatusMap = ['paid' => ['مدفوع','paid'], 'pending' => ['انتظار الدفع','pending'], 'failed' => ['فاشل','failed']];
        [$payLabel, $payClass] = $isCod && $order->status === 'pending'
          ? ['الدفع عند الاستلام', 'pending']
          : ($payStatusMap[$order->status] ?? [$order->status, 'pending']);
        $deliveryMap = [
          'pending'   => ['⏳ في الانتظار',  'pending'],
          'confirmed' => ['✅ تم التأكيد',   'paid'],
          'preparing' => ['📦 جارٍ التحضير', 'pending'],
          'shipped'   => ['🚚 في الطريق',   'pending'],
          'delivered' => ['🎉 تم التسليم',   'paid'],
          'cancelled' => ['❌ ملغي',         'failed'],
        ];
        [$deliveryLabel, $deliveryClass] = $deliveryMap[$order->delivery_status ?? ''] ?? ['—', 'pending'];
      @endphp
      <span class="status-badge status-{{ $payClass }}">{{ $payLabel }}</span>
      @if($order->delivery_status)
      <span class="status-badge status-{{ $deliveryClass }}" style="margin-right:6px">{{ $deliveryLabel }}</span>
      @endif
    </div>
  </div>

  {{-- Customer --}}
  <div class="section">
    <div class="section-title">بيانات العميل</div>
    <div class="info-grid">
      <div class="info-item"><label>الاسم</label><span>{{ $order->customer_name }}</span></div>
      <div class="info-item"><label>الجوال</label><span>{{ $order->customer_phone }}</span></div>
      @if($order->customer_email)
      <div class="info-item"><label>الإيميل</label><span>{{ $order->customer_email }}</span></div>
      @endif
      <div class="info-item"><label>المدينة</label><span>{{ $order->city }}</span></div>
      <div class="info-item"><label>طريقة الدفع</label><span>{{ $paymentMethodLabel }}</span></div>
      <div class="info-item" style="grid-column:1/-1"><label>العنوان</label><span>{{ $order->address }}</span></div>
      @if($order->map_url)
      <div class="info-item" style="grid-column:1/-1">
        <label>موقع التوصيل</label>
        <span>
          <a href="{{ $order->map_url }}" style="color:#f59e0b;text-decoration:none;font-weight:600">
            📍 عرض على الخريطة
          </a>
        </span>
      </div>
      @endif
      @if($order->notes)
      <div class="info-item" style="grid-column:1/-1"><label>ملاحظات</label><span>{{ $order->notes }}</span></div>
      @endif
    </div>
  </div>

  {{-- Products --}}
  <div class="section">
    <div class="section-title">المنتجات</div>
    <table>
      <thead>
        <tr>
          <th style="width:50px">صورة</th>
          <th>المنتج</th>
          <th style="width:80px">الكمية</th>
          <th style="width:100px">السعر</th>
          <th style="width:110px">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        @foreach($order->items ?? [] as $item)
        <tr>
          <td>
            @if(!empty($item['image']))
              <img src="{{ $item['image'] }}" class="product-img" alt="">
            @else
              <div style="width:44px;height:44px;background:#f3f4f6;border-radius:6px;border:1px solid #e5e7eb"></div>
            @endif
          </td>
          <td>
            <div class="product-name">{{ $item['name'] ?? '—' }}</div>
            @if(!empty($item['sku']))
              <div class="product-sku">SKU: {{ $item['sku'] }}</div>
              <div class="product-barcode">
                <svg class="barcode" data-sku="{{ $item['sku'] }}"></svg>
              </div>
            @endif
          </td>
          <td style="text-align:center">{{ $item['quantity'] ?? 1 }}</td>
          <td>{{ number_format(($item['price'] ?? 0), 2) }} ر.س</td>
          <td>{{ number_format(($item['price'] ?? 0) * ($item['quantity'] ?? 1), 2) }} ر.س</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  {{-- Totals --}}
  <div class="section">
    <div class="section-title">الحساب</div>
    <div class="totals">
      <div class="totals-row"><span>المجموع الفرعي (شامل الضريبة)</span><span>{{ number_format($order->subtotal, 2) }} ر.س</span></div>
      @if($order->tax_amount > 0)
      <div class="totals-row" style="color:#6b7280"><span>ضريبة القيمة المضافة (15%، ضمن المجموع الفرعي)</span><span>{{ number_format($order->tax_amount, 2) }} ر.س</span></div>
      @endif
      <div class="totals-row"><span>رسوم التوصيل</span><span>{{ number_format($order->delivery_fee, 2) }} ر.س</span></div>
      @if($order->cod_fee > 0)
      <div class="totals-row"><span>رسوم الدفع عند الاستلام</span><span>{{ number_format($order->cod_fee, 2) }} ر.س</span></div>
      @endif
      @if($order->discount > 0)
      <div class="totals-row"><span>الخصم</span><span>- {{ number_format($order->discount, 2) }} ر.س</span></div>
      @endif
      @if($order->wallet_amount > 0)
      <div class="totals-row"><span>المحفظة</span><span>- {{ number_format($order->wallet_amount, 2) }} ر.س</span></div>
      @endif
      <div class="totals-row grand"><span>الإجمالي</span><span>{{ number_format($order->total, 2) }} ر.س</span></div>
    </div>
  </div>

  <div class="footer">شكراً لتسوقك معنا — المخازن الاقتصادية • storeseco.com</div>
</div>

<button class="print-btn no-print" onclick="window.print()">🖨 طباعة / حفظ PDF</button>

<script>
  window.addEventListener('load', () => {
    // Generate barcode for each product SKU
    document.querySelectorAll('svg.barcode').forEach(svg => {
      const sku = svg.getAttribute('data-sku');
      if (!sku) return;

      // EAN-13 = exactly 13 digits; otherwise CODE128
      const isEan13 = /^\d{13}$/.test(sku);
      try {
        JsBarcode(svg, sku, {
          format:      isEan13 ? 'EAN13' : 'CODE128',
          width:       1.4,
          height:      36,
          displayValue: true,
          fontSize:    9,
          margin:      2,
          background:  '#ffffff',
          lineColor:   '#1a1a1a',
        });
      } catch(e) {
        // Fallback to CODE128 if EAN validation fails
        try {
          JsBarcode(svg, sku, { format: 'CODE128', width: 1.4, height: 36, displayValue: true, fontSize: 9, margin: 2 });
        } catch(_) {}
      }
    });

    // Auto-trigger print dialog after barcodes render
    setTimeout(() => window.print(), 700);
  });
</script>
</body>
</html>
