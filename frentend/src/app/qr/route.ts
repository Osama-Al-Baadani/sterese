// Standalone "link in bio" landing page — lives outside the [locale] tree on
// purpose (like feed/google-merchant.xml) because it's a self-contained,
// non-localized document already printed on physical materials (storeseco.com/qr).
// The path itself is fixed by what's already printed — do not rename.

const html = String.raw`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>المخازن الاقتصادية | كل روابطنا في مكان واحد</title>
<meta name="description" content="حمّل تطبيق المخازن الاقتصادية، تسوّق من الموقع، أو تابعنا على وسائل التواصل — كل الروابط في صفحة واحدة.">
<meta name="robots" content="noindex">
<meta property="og:title" content="المخازن الاقتصادية — كل روابطنا">
<meta property="og:description" content="التطبيق، الموقع، الموقع الجغرافي، وحساباتنا — في مكان واحد.">
<meta property="og:image" content="https://storeseco.com/wp-content/uploads/2026/03/Untitled-design-1.webp">
<link rel="icon" href="https://storeseco.com/wp-content/uploads/2026/03/cropped-شعار-متجر-المخازن-الاقتصادية--270x270.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F5F7F9;
    --ink:#16222E;
    --muted:#5A6672;
    --green:#2068A8;
    --green-deep:#154A78;
    --amber:#F0A818;
    --card:#FFFFFF;
    --line:#E2E7EC;
    --radius:18px;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{
    font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;
    background:
      radial-gradient(900px 420px at 50% -180px, rgba(32,104,168,.10), transparent 70%),
      var(--bg);
    color:var(--ink);
    min-height:100vh;
    display:flex;
    justify-content:center;
    padding:32px 18px 48px;
  }
  .wrap{width:100%;max-width:460px}

  /* ===== header ===== */
  header{text-align:center;margin-bottom:26px}
  .logo{
    width:104px;height:104px;border-radius:26px;
    background:#fff;border:1px solid var(--line);
    box-shadow:0 8px 28px rgba(32,104,168,.14);
    display:inline-flex;align-items:center;justify-content:center;
    overflow:hidden;margin-bottom:14px;
  }
  .logo img{width:86%;height:86%;object-fit:contain}
  h1{
    font-family:"Alexandria",sans-serif;font-weight:800;
    font-size:1.55rem;letter-spacing:-.01em;color:var(--green-deep);
  }
  .tagline{color:var(--muted);font-size:.95rem;margin-top:6px}

  /* ===== hero: app download ===== */
  .hero{
    background:linear-gradient(150deg,var(--green) 0%,var(--green-deep) 100%);
    border-radius:calc(var(--radius) + 6px);
    padding:22px 20px 20px;
    color:#fff;
    box-shadow:0 14px 34px rgba(21,74,120,.30);
    margin-bottom:22px;
    position:relative;overflow:hidden;
  }

  .hero h2{font-family:"Alexandria",sans-serif;font-weight:700;font-size:1.15rem;margin-bottom:4px}
  .hero p{font-size:.88rem;opacity:.85;margin-bottom:16px}
  .stores{display:flex;gap:10px}
  .store-btn{
    flex:1;display:flex;align-items:center;gap:11px;justify-content:center;
    background:#fff;
    border:none;
    border-radius:15px;padding:14px 12px;
    color:var(--green-deep);text-decoration:none;
    box-shadow:0 8px 20px rgba(0,0,0,.22);
    transition:transform .15s ease, box-shadow .15s ease;
  }
  .store-btn:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(0,0,0,.28)}
  .store-btn svg{width:26px;height:26px;flex:none}
  .store-btn .t{text-align:right;line-height:1.15}
  .store-btn .t small{display:block;font-size:.7rem;color:var(--muted)}
  .store-btn .t strong{font-size:1rem;font-weight:700;font-family:"Alexandria",sans-serif}
  .store-btn.primary{
    background:linear-gradient(160deg,#FFC340,var(--amber));
    color:#3A2A05;
    box-shadow:0 10px 26px rgba(240,168,24,.55);
    transform:scale(1.04);
  }
  .store-btn.primary:hover{transform:scale(1.04) translateY(-3px)}
  .store-btn.primary .t small{color:#6B4E0E}

  /* ===== link list ===== */
  .links{display:flex;flex-direction:column;gap:12px}
  .link{
    display:flex;align-items:center;gap:14px;
    background:var(--card);border:1px solid var(--line);
    border-radius:var(--radius);padding:15px 16px;
    color:var(--ink);text-decoration:none;
    transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .link:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(22,34,46,.08);border-color:#cdd7e0}
  .link .ico{
    width:44px;height:44px;border-radius:13px;flex:none;
    display:flex;align-items:center;justify-content:center;
  }
  .link .ico svg{width:22px;height:22px}
  .link .txt{flex:1;line-height:1.25}
  .link .txt strong{display:block;font-weight:600;font-size:.98rem}
  .link .txt span{font-size:.8rem;color:var(--muted)}
  .link .arrow{color:var(--muted);flex:none;transform:scaleX(-1)}
  .ico.web{background:#E6EFF7;color:var(--green)}
  .ico.map{background:#FDF2DA;color:#B97F0E}
  .ico.tiktok{background:#111418;color:#fff}
  .ico.snap{background:#FFFC00;color:#1a1a1a}

  footer{text-align:center;margin-top:30px;color:var(--muted);font-size:.78rem}
  footer a{color:var(--green);text-decoration:none;font-weight:500}



  /* ===== social icon grid ===== */
  .social-section{margin-top:24px;text-align:center}
  .social-title{
    font-family:"Alexandria",sans-serif;font-size:1rem;font-weight:700;
    color:var(--green-deep);margin-bottom:14px;
  }
  .social-icons{
    display:grid;grid-template-columns:repeat(4,1fr);gap:12px;
  }
  .social-icon{
    min-width:0;aspect-ratio:1/1;border-radius:18px;
    display:flex;align-items:center;justify-content:center;
    color:#fff;text-decoration:none;
    box-shadow:0 9px 22px rgba(22,34,46,.13);
    transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;
    position:relative;overflow:hidden;
  }
  .social-icon::after{
    content:"";position:absolute;inset:0;
    background:linear-gradient(145deg,rgba(255,255,255,.22),transparent 48%);
    pointer-events:none;
  }
  .social-icon:hover{transform:translateY(-4px);box-shadow:0 14px 28px rgba(22,34,46,.18);filter:saturate(1.06)}
  .social-icon:focus-visible{outline:3px solid rgba(240,168,24,.55);outline-offset:3px}
  .social-icon svg{width:34%;height:34%;position:relative;z-index:1}
  .social-icon.whatsapp{background:#25D366}
  .social-icon.instagram{background:radial-gradient(circle at 30% 105%,#fdf497 0 6%,#fd5949 42%,#d6249f 62%,#285AEB 92%)}
  .social-icon.tiktok{background:#111418}
  .social-icon.facebook{background:#1877F2}
  @media(max-width:380px){
    .social-icons{gap:9px}
    .social-icon{border-radius:15px}
  }

  @media (prefers-reduced-motion: reduce){
    .link,.store-btn{transition:none}
  }
  @media (max-width:380px){
    .stores{flex-direction:column}
  }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="logo">
      <img src="data:image/png;base64,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" alt="شعار المخازن الاقتصادية">
    </div>
    <h1>المخازن الاقتصادية</h1>
    <p class="tagline">كل احتياجات منزلك… توصيل سريع داخل الرياض</p>
  </header>

  <section class="hero" aria-label="تحميل التطبيق">
    <h2>حمّل التطبيق الآن</h2>
    <p>عروض حصرية وتجربة تسوّق أسرع من التطبيق</p>
    <div class="stores" id="stores">
      <a class="store-btn" id="btn-android" href="https://play.google.com/store/apps/details?id=sa.storeseco.app" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z"/><path d="M16 15.6 12.9 12.5v-.2L16 9.2l.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2.1-.1-.1z" opacity=".8"/><path d="M16.1 15.5 12.9 12.4 3.6 21.7c.4.4 1 .4 1.7 0l10.8-6.2" opacity=".6"/><path d="M16.1 9.3 5.3 3.1c-.7-.4-1.3-.4-1.7 0l9.3 9.3 3.2-3.1z" opacity=".9"/></svg>
        <span class="t"><small>حمّله من</small><strong>Google Play</strong></span>
      </a>
      <a class="store-btn" id="btn-ios" href="https://apps.apple.com/us/app/id6778609957" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.1 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.9-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.7-3.8zM14.7 5.3c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.5z"/></svg>
        <span class="t"><small>حمّله من</small><strong>App Store</strong></span>
      </a>
    </div>
  </section>

  <nav class="links" aria-label="روابطنا">
    <a class="link" href="https://storeseco.com/" target="_blank" rel="noopener">
      <span class="ico web"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg></span>
      <span class="txt"><strong>الموقع الإلكتروني</strong><span>storeseco.com — تسوّق كل الأقسام</span></span>
      <svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </a>

    <a class="link" href="https://share.google/NhA4nghqRUVGDB6oP" target="_blank" rel="noopener">
      <span class="ico map"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg></span>
      <span class="txt"><strong>موقعنا على الخريطة</strong><span>الوصول إلينا عبر خرائط Google</span></span>
      <svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </a>



    <a class="link" href="https://www.snapchat.com/add/storeseco_1" target="_blank" rel="noopener">
      <span class="ico snap"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5c2.9 0 5 2.2 5 5.1 0 .8 0 1.5-.1 2.1.4.2.9 0 1.2-.1.4-.2 1-.1 1.2.4.2.5-.2.9-.6 1.1-.5.3-1.4.5-1.6 1.1-.1.4.1.9.4 1.4.6 1 1.6 1.9 2.9 2.2.3.1.5.3.5.6 0 .2-.2.5-.5.6-.6.3-1.5.4-1.7.7-.2.2-.1.6-.3.9-.2.3-.5.3-.9.3-.5 0-1.2-.1-1.8 0-.6.2-1.1.7-1.8 1.1-.6.4-1.2.5-1.9.5s-1.3-.1-1.9-.5c-.7-.4-1.2-.9-1.8-1.1-.6-.1-1.3 0-1.8 0-.4 0-.7 0-.9-.3-.2-.3-.1-.7-.3-.9-.2-.3-1.1-.4-1.7-.7-.3-.1-.5-.4-.5-.6 0-.3.2-.5.5-.6 1.3-.3 2.3-1.2 2.9-2.2.3-.5.5-1 .4-1.4-.2-.6-1.1-.8-1.6-1.1-.4-.2-.8-.6-.6-1.1.2-.5.8-.6 1.2-.4.3.1.8.3 1.2.1-.1-.6-.1-1.3-.1-2.1 0-2.9 2.1-5.1 5-5.1z"/></svg></span>
      <span class="txt"><strong>سناب شات</strong><span>storeseco_1</span></span>
      <svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </a>
  </nav>

  <section class="social-section" aria-label="حسابات التواصل الاجتماعي">
    <h2 class="social-title">تابعنا وتواصل معنا</h2>
    <div class="social-icons">
      <a class="social-icon whatsapp" href="https://wa.me/966596151494" target="_blank" rel="noopener" aria-label="واتساب">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2.8 18.3L2 22l3.8-.8A11.8 11.8 0 1 0 20.5 3.5zm-8.4 16.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-2.2.5.6-2.1-.3-.4a9.3 9.3 0 1 1 7.7 3.7zm5.1-6.9c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.8-1.7-3.9-3.8-.3-.4.3-.4.8-1.4.1-.2 0-.4 0-.5l-.9-2.2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.8-1 1.8-1 2.9 0 1.2.8 2.3.9 2.5.1.2 1.8 2.9 4.4 4 .6.3 1.2.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2.1-1.5.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.3z"/></svg>
      </a>
      <a class="social-icon instagram" href="https://www.instagram.com/storesecoksa/?hl=ar" target="_blank" rel="noopener" aria-label="إنستغرام">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.2A4.8 4.8 0 1 1 7.2 12 4.8 4.8 0 0 1 12 7.2zm0 2A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2zM17.8 5.5A1.2 1.2 0 1 1 16.6 6.7a1.2 1.2 0 0 1 1.2-1.2z"/></svg>
      </a>
      <a class="social-icon tiktok" href="https://www.tiktok.com/@storesecoksa?is_from_webapp=1&amp;sender_device=pc" target="_blank" rel="noopener" aria-label="تيك توك">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 7.3a5.6 5.6 0 0 1-3.4-1.1 5.6 5.6 0 0 1-2-2.7h-3v12.1a2.9 2.9 0 1 1-2.1-2.8V9.7a6 6 0 1 0 5.1 5.9V9.4a8.5 8.5 0 0 0 5.4 1.9v-4z"/></svg>
      </a>
      <a class="social-icon facebook" href="https://www.facebook.com/p/%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D8%B2%D9%86-%D8%A7%D9%84%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF%D9%8A%D8%A9-61573061786343/" target="_blank" rel="noopener" aria-label="فيسبوك">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.4-.1-1.3-.2-2.5-.2-2.5 0-4.1 1.5-4.1 4.3V11H8v3h2.4v8h3.1z"/></svg>
      </a>
    </div>
  </section>

  <footer>
    © <span id="year"></span> المخازن الاقتصادية — <a href="https://storeseco.com/" target="_blank" rel="noopener">storeseco.com</a>
  </footer>

</div>

<script>
  document.getElementById('year').textContent = new Date().getFullYear();

  // اكتشاف نظام التشغيل: زر متجر الزائر يصبح البارز ويتقدّم
  (function(){
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var stores = document.getElementById('stores');
    var iosBtn = document.getElementById('btn-ios');
    var andBtn = document.getElementById('btn-android');
    if (ios) {
      iosBtn.classList.add('primary');
      stores.insertBefore(iosBtn, stores.firstChild);
    } else if (android) {
      andBtn.classList.add('primary');
    } else {
      // زائر من الكمبيوتر: الزران متساويان
    }
  })();
</script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
