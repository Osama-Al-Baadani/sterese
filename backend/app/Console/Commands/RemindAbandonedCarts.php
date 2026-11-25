<?php

namespace App\Console\Commands;

use App\Models\AbandonedCart;
use App\Services\FcmService;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RemindAbandonedCarts extends Command
{
    protected $signature = 'cart:remind-abandoned';

    protected $description = 'Notify (push + WhatsApp) customers who abandoned their cart 30+ minutes ago and have not been reminded yet';

    public function handle(FcmService $fcm, WhatsAppService $whatsapp): int
    {
        $carts = AbandonedCart::whereNull('reminded_at')
            ->whereNotIn('status', ['converted', 'lost'])
            ->where('created_at', '<=', now()->subMinutes(30))
            ->get();

        foreach ($carts as $cart) {
            $token = DB::table('customer_fcm_tokens')->where('phone', $cart->phone)->value('fcm_token');

            if ($token) {
                $sent = $fcm->sendToDevice(
                    $token,
                    '🛒 نسيت شيء في سلتك؟',
                    'سلتك بقيمة ' . number_format($cart->total, 2) . ' ر.س بانتظارك — أكمل طلبك الآن.',
                    ['type' => 'abandoned_cart', 'route' => '/cart'],
                );

                if (!$sent) {
                    Log::warning('[AbandonedCartReminder] FCM send failed', ['phone' => $cart->phone]);
                }
            }

            $waSent = $whatsapp->sendCartReminder($cart->phone, $cart->name, $cart->total);
            if (!$waSent) {
                Log::warning('[AbandonedCartReminder] WhatsApp send failed', ['phone' => $cart->phone]);
            }

            // Marked as reminded either way — no token/no WhatsApp config
            // means the customer simply can't be reached this way, retrying
            // every run forever would be noise, not a fix.
            $cart->update(['reminded_at' => now()]);
        }

        // A cron-run command's console output goes nowhere (redirected to
        // /dev/null) — this is the only record that the run actually
        // happened, and it's what confirms the cron itself is firing.
        Log::info("[AbandonedCartReminder] run complete, reminded {$carts->count()} cart(s)");
        $this->info("Reminded {$carts->count()} abandoned cart(s).");
        return self::SUCCESS;
    }
}
