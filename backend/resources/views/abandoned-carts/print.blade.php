<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>سلة مهجورة #{{ $cart->id }} — {{ $cart->name }}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; direction: rtl; }
  .page { max-width: 820px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px; }
  .logo-area h1 { font-size: 22px; font-weight: 700; color: #f59e0b; }
  .logo-area p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .cart-meta { text-align: left; }
  .cart-meta .cart-num  { font-size: 18px; font-weight: 700; color: #111; }
  .cart-meta .cart-date { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 6px; }
  .status-new       { background: #fef9c3; color: #854d0e; }
  .status-contacted { background: #dbeafe; color: #1e40af; }
  .status-converted { background: #dcfce7; color: #166534; }
  .status-lost      { background: #fee2e2; color: #991b1b; }

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
  .product-img  { width: 52px; height: 52px; object-fit: contain; border-radius: 6px; border: 1px solid #e5e7eb; background: #f9fafb; }
  .product-name { font-weight: 600; color: #111; line-height: 1.4; }
  .product-sku  { font-size: 10px; color: #9ca3af; margin-top: 2px; }
  .barcode-wrap { margin-top: 5px; }
  .barcode-wrap svg { max-width: 130px; height: 36px; }

  /* Totals */
  .totals { margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .totals-row.grand { font-size: 15px; font-weight: 700; border-top: 2px solid #f59e0b; padding-top: 8px; margin-top: 4px; }

  /* Notice */
  .notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #92400e; margin-top: 16px; }

  /* Footer */
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }

  /* Print button */
  .print-btn { display: inline-flex; align-items: center; gap: 6px; background: #f59e0b; color: #fff; border: none; border-radius: 6px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
  .print-btn:hover { background: #d97706; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 10px; }
  }
</style>
</head>
<body>
<div class="page">

  {{-- Print button --}}
  <div class="no-print" style="margin-bottom:16px;">
    <button class="print-btn" onclick="window.print()">🖨 طباعة الفاتورة</button>
  </div>

  {{-- Header --}}
  <div class="header">
    <div class="logo-area">
      <h1>المخازن الاقتصادية</h1>
      <p>storeseco.com</p>
    </div>
    <div class="cart-meta">
      <div class="cart-num">سلة مهجورة #{{ $cart->id }}</div>
      <div class="cart-date">{{ $cart->created_at->format('Y/m/d — H:i') }}</div>
      @php
        $statusMap = ['new'=>'جديدة','contacted'=>'تم التواصل','converted'=>'تحولت لطلب','lost'=>'خسرناها'];
      @endphp
      <span class="status-badge status-{{ $cart->status }}">
        {{ $statusMap[$cart->status] ?? $cart->status }}
      </span>
      @if($cart->woo_order_id)
        <div style="font-size:11px;color:#16a34a;margin-top:4px;font-weight:600;">رقم الطلب: #{{ $cart->woo_order_id }}</div>
      @endif
    </div>
  </div>

  {{-- Customer Info --}}
  <div class="section">
    <div class="section-title">بيانات العميل</div>
    <div class="info-grid">
      <div class="info-item">
        <label>الاسم</label>
        <span>{{ $cart->name ?: '—' }}</span>
      </div>
      <div class="info-item">
        <label>رقم الجوال</label>
        <span>{{ $cart->phone }}</span>
      </div>
      @if($cart->contacted_at)
      <div class="info-item">
        <label>تاريخ التواصل</label>
        <span>{{ $cart->contacted_at->format('Y/m/d — H:i') }}</span>
      </div>
      @endif
      <div class="info-item">
        <label>تاريخ إنشاء السلة</label>
        <span>{{ $cart->created_at->format('Y/m/d — H:i') }}</span>
      </div>
    </div>
  </div>

  {{-- Products --}}
  <div class="section">
    <div class="section-title">المنتجات</div>
    <table>
      <thead>
        <tr>
          <th style="width:60px;">الصورة</th>
          <th>المنتج</th>
          <th style="width:80px;text-align:center;">الكمية</th>
          <th style="width:100px;text-align:center;">سعر الوحدة</th>
          <th style="width:100px;text-align:center;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        @php $items = is_array($cart->cart_items) ? $cart->cart_items : json_decode($cart->cart_items, true); @endphp
        @foreach($items ?? [] as $item)
        <tr>
          <td>
            @if(!empty($item['image']))
              <img class="product-img" src="{{ $item['image'] }}" alt="{{ $item['name'] ?? '' }}" onerror="this.style.display='none'">
            @else
              <div class="product-img" style="display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:20px;">📦</div>
            @endif
          </td>
          <td>
            <div class="product-name">{{ $item['name'] ?? '—' }}</div>
            @if(!empty($item['sku']))
              <div class="product-sku">SKU: {{ $item['sku'] }}</div>
              <div class="barcode-wrap">
                <svg class="barcode-svg" data-sku="{{ $item['sku'] }}"></svg>
              </div>
            @endif
          </td>
          <td style="text-align:center;">{{ $item['qty'] ?? $item['quantity'] ?? 1 }}</td>
          <td style="text-align:center;">{{ number_format((float)($item['price'] ?? 0), 2) }} ر.س</td>
          <td style="text-align:center;">{{ number_format((float)($item['price'] ?? 0) * (int)($item['qty'] ?? $item['quantity'] ?? 1), 2) }} ر.س</td>
        </tr>
        @endforeach
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row grand">
        <span>الإجمالي الكلي</span>
        <span>{{ number_format((float)$cart->total, 2) }} ر.س</span>
      </div>
    </div>
  </div>

  {{-- Notice --}}
  <div class="notice">
    ⚠️ هذه فاتورة سلة مهجورة — لم يتم إتمام الطلب بعد. يُرجى التواصل مع العميل لإتمام عملية الشراء.
  </div>

  {{-- Footer --}}
  <div class="footer">
    <p>المخازن الاقتصادية | storeseco.com | {{ now()->format('Y/m/d') }}</p>
  </div>

</div>

<script>
document.querySelectorAll('.barcode-svg[data-sku]').forEach(function(el) {
  try {
    JsBarcode(el, el.getAttribute('data-sku'), {
      format: 'CODE128',
      width: 1.2,
      height: 36,
      displayValue: false,
      margin: 0,
    });
  } catch(e) {}
});
</script>
</body>
</html>
