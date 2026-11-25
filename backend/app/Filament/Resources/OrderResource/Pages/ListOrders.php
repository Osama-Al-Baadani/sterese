<?php

namespace App\Filament\Resources\OrderResource\Pages;

use App\Filament\Resources\OrderResource;
use App\Models\Order;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ListOrders extends ListRecords
{
    protected static string $resource = OrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('sync_woo')
                ->label('مزامنة من WooCommerce')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('info')
                ->requiresConfirmation()
                ->modalHeading('مزامنة الطلبات من WooCommerce')
                ->modalDescription('سيتم جلب آخر 50 طلب من WooCommerce وحفظها في لوحة التحكم. قد يستغرق ذلك بضع ثوانٍ.')
                ->modalSubmitActionLabel('مزامنة الآن')
                ->action(function () {
                    $consumerKey    = config('services.woocommerce.key');
                    $consumerSecret = config('services.woocommerce.secret');
                    $storeUrl       = config('services.woocommerce.url');

                    try {
                        // See App\Support\OriginHttp — WooCommerce and this
                        // Laravel API share a server, and PHP-originated
                        // HTTPS requests between them get a flat 403 from
                        // this host's security layer. Shell `curl` isn't
                        // affected, which is what this now goes through.
                        $response = new \App\Support\OriginHttpResponse(\App\Support\OriginHttp::get(
                            "{$storeUrl}/wp-json/wc/v3/orders",
                            ['per_page' => 50, 'orderby' => 'date', 'order' => 'desc'],
                            basicAuth: [$consumerKey, $consumerSecret],
                            timeout: 30,
                        ));

                        if (!$response->successful()) {
                            Notification::make()
                                ->title('فشل الاتصال بـ WooCommerce')
                                ->body('كود الخطأ: ' . $response->status())
                                ->danger()
                                ->send();
                            return;
                        }

                        $orders  = $response->json();
                        $imported = 0;

                        // One transaction for all 50 upserts instead of 50
                        // separate auto-committed writes — same end result,
                        // noticeably less database overhead for what was one
                        // of the heavier things this account's CPU quota
                        // actually gets asked to do in a single request.
                        DB::transaction(function () use ($orders, &$imported) {
                            foreach ($orders as $data) {
                                $wooId   = $data['id'] ?? null;
                                if (!$wooId) continue;

                                $billing = $data['billing'] ?? [];
                                $name    = trim(($billing['first_name'] ?? '') . ' ' . ($billing['last_name'] ?? ''));

                                $lineItems = array_map(fn($item) => [
                                    'id'       => $item['product_id'] ?? 0,
                                    'name'     => $item['name'] ?? '',
                                    'quantity' => $item['quantity'] ?? 1,
                                    'price'    => (float) ($item['price'] ?? 0),
                                    'sku'      => $item['sku'] ?? '',
                                    'image'    => $item['image']['src'] ?? '',
                                ], $data['line_items'] ?? []);

                                $wooStatus  = $data['status'] ?? 'pending';
                                $localStatus = match ($wooStatus) {
                                    'processing'  => 'pending',
                                    'completed'   => 'shipped',
                                    'cancelled'   => 'cancelled',
                                    'refunded'    => 'cancelled',
                                    'on-hold'     => 'pending',
                                    default       => 'pending',
                                };

                                // Same fix as WooWebhookController::handle() — for an
                                // order our own app already tracked (via createOrder/
                                // track), the money fields were computed correctly
                                // from trusted sources (real coupon lookups, real
                                // wallet debits). WooCommerce's raw payload doesn't
                                // reflect those: our discount is applied as a manual
                                // fee_line, not a real coupon, so 'discount_total' is
                                // always 0 here, and there's no top-level 'subtotal'
                                // field at all, so it silently fell back to the full
                                // order total. Blindly re-deriving these on every sync
                                // was wiping a correctly-recorded coupon/wallet the
                                // moment someone clicked this button — only status/
                                // customer/items are safe to keep syncing every time.
                                $existing = Order::where('woo_order_id', (string) $wooId)->first();

                                $attrs = [
                                    'customer_name'  => $name ?: 'غير محدد',
                                    'customer_phone' => $billing['phone'] ?? '',
                                    'customer_email' => $billing['email'] ?? '',
                                    'address'        => $billing['address_1'] ?? '',
                                    'city'           => $billing['city'] ?? '',
                                    'status'         => $localStatus,
                                    'notes'          => $data['customer_note'] ?? '',
                                    'items'          => $lineItems,
                                ];

                                if ($existing) {
                                    $existing->update($attrs);
                                } else {
                                    Order::create($attrs + [
                                        'woo_order_id'  => (string) $wooId,
                                        'subtotal'      => (float) ($data['subtotal'] ?? $data['total'] ?? 0),
                                        'delivery_fee'  => (float) ($data['shipping_total'] ?? 0),
                                        'discount'      => (float) ($data['discount_total'] ?? 0),
                                        'wallet_amount' => 0,
                                        'total'         => (float) ($data['total'] ?? 0),
                                    ]);
                                }
                                $imported++;
                            }
                        });

                        Log::info('[WooSync] Imported orders', ['count' => $imported]);

                        Notification::make()
                            ->title('تمت المزامنة بنجاح')
                            ->body("تم استيراد {$imported} طلب من WooCommerce.")
                            ->success()
                            ->send();

                    } catch (\Throwable $e) {
                        Log::error('[WooSync] Error', ['error' => $e->getMessage()]);
                        Notification::make()
                            ->title('خطأ في المزامنة')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
