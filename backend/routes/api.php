<?php

use App\Http\Controllers\Api\AbandonedCartController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AppConfigController;
use App\Http\Controllers\Api\AppInstallController;
use App\Http\Controllers\Api\BrowseSectionController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\HomeDepartmentController;
use App\Http\Controllers\Api\HomeSectionController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\WalletTopupController;
use App\Http\Controllers\Api\WooWebhookController;
use App\Http\Middleware\VerifyV2ApiKey;
use Illuminate\Support\Facades\Route;

// ── Native Catalog & Coupons v2 (Authenticated via ApiKey Basic Auth) ────────
Route::prefix('v2')->middleware(VerifyV2ApiKey::class)->group(function () {
    Route::get('/storefront-init', [CatalogController::class, 'storefrontInit']);
    Route::get('/products', [CatalogController::class, 'products']);
    Route::get('/products/{id}', [CatalogController::class, 'product'])->whereNumber('id');
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/category-sections', [CatalogController::class, 'categorySections']);
    Route::get('/brands', [CatalogController::class, 'brands']);
    Route::get('/coupons/validate', [CatalogController::class, 'validateCoupon']);
});

// ── Products & Categories (Native local catalog — mobile app compatibility) ──
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{id}', [CatalogController::class, 'product'])->whereNumber('id');
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/category-sections', [CatalogController::class, 'categorySections']);
Route::get('/brands', [CatalogController::class, 'brands']);

// ── App Config & Storefront Sections ─────────────────────────────────────────
Route::get('/app-config', [AppConfigController::class, 'index']);
Route::get('/home-sections', [HomeSectionController::class, 'index']);
Route::get('/browse-sections', [BrowseSectionController::class, 'index']);
Route::get('/home-departments', [HomeDepartmentController::class, 'index']);
Route::get('/delivery-eligibility', [OrderController::class, 'deliveryEligibility']);

// ── Auth & Phone OTP ─────────────────────────────────────────────────────────
Route::post('/auth/login', [CustomerController::class, 'login']);
Route::post('/otp/send', [OtpController::class, 'send']);
Route::post('/otp/verify', [OtpController::class, 'verify']);

// ── Customers ────────────────────────────────────────────────────────────────
Route::get('/customers/find', [CustomerController::class, 'findByPhone']);
Route::post('/customers', [CustomerController::class, 'createCustomer']);
Route::put('/customers/{id}', [CustomerController::class, 'updateCustomer'])->whereNumber('id');
Route::get('/customers/{id}', [CustomerController::class, 'getCustomer'])->whereNumber('id');

// ── Wallet ───────────────────────────────────────────────────────────────────
Route::get('/wallet/{id}', [CustomerController::class, 'walletBalance'])->whereNumber('id');
Route::post('/wallet/{id}/credit', [CustomerController::class, 'walletCredit'])->whereNumber('id');
Route::post('/wallet/{id}/debit', [CustomerController::class, 'walletDebit'])->whereNumber('id');
Route::post('/wallet-topups/create', [WalletTopupController::class, 'create']);
Route::get('/wallet-topups/{id}/status', [WalletTopupController::class, 'status']);

// ── Orders & Coupons (Legacy app routes — now powered natively) ──────────────
Route::post('/orders', [CustomerController::class, 'createOrder']);
Route::get('/orders', [CustomerController::class, 'getOrders']);
Route::get('/coupons', [CustomerController::class, 'validateCoupon']);

// ── Welcome Offer ────────────────────────────────────────────────────────────
Route::get('/welcome-offer', [CustomerController::class, 'welcomeOffer']);
Route::post('/welcome-offer/generate-coupon', [CustomerController::class, 'generateWelcomeCoupon']);

// ── Orders (Unified Native Checkout: PayMob + COD + Order History) ───────────
Route::prefix('paymob-orders')->group(function () {
    Route::get('/', [OrderController::class, 'customerOrders']);
    Route::post('/create', [OrderController::class, 'create']);
    Route::get('/{id}/status', [OrderController::class, 'status'])->whereNumber('id');
    Route::get('/{id}', [OrderController::class, 'show'])->whereNumber('id');
});

// ── Webhooks ─────────────────────────────────────────────────────────────────
Route::post('/webhooks/paymob', [PaymentController::class, 'webhook']);
Route::post('/webhooks/woocommerce', [WooWebhookController::class, 'handle']);

// ── Legacy Order Tracking ────────────────────────────────────────────────────
Route::post('/orders/track', [OrderController::class, 'track']);
Route::post('/orders/public-track', [OrderController::class, 'publicTrack']);
Route::patch('/orders/track/{wooOrderId}/paid', [OrderController::class, 'markPaid']);

// ── Customer Addresses ───────────────────────────────────────────────────────
Route::get('/addresses', [AddressController::class, 'index']);
Route::post('/addresses', [AddressController::class, 'store']);
Route::put('/addresses/{id}', [AddressController::class, 'update'])->whereNumber('id');
Route::delete('/addresses/{id}', [AddressController::class, 'destroy'])->whereNumber('id');

// ── FCM Device Tokens & Analytics ────────────────────────────────────────────
Route::post('/fcm-token', [CustomerController::class, 'saveFcmToken']);
Route::post('/app-installs', [AppInstallController::class, 'track']);

// ── Abandoned Carts ──────────────────────────────────────────────────────────
Route::post('/abandoned-cart', [AbandonedCartController::class, 'store']);
Route::delete('/abandoned-cart/{phone}', [AbandonedCartController::class, 'destroy']);
Route::post('/abandoned-cart/{cart}/convert', [AbandonedCartController::class, 'convertToOrder']);
Route::patch('/abandoned-cart/{cart}/status', [AbandonedCartController::class, 'updateStatus']);
