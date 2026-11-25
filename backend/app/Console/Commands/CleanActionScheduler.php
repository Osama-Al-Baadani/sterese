<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanActionScheduler extends Command
{
    protected $signature = 'woocommerce:clean-action-scheduler {--days=7 : Keep completed/failed actions newer than this many days}';

    protected $description = 'Deletes old completed/failed WooCommerce Action Scheduler rows — never touches pending/in-progress ones';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->utc()->subDays($days);
        $conn = DB::connection('woocommerce');

        $totalLogs = 0;
        do {
            $deleted = $conn->table('actionscheduler_logs')
                ->whereIn('action_id', function ($q) use ($conn, $cutoff) {
                    $q->select('action_id')->from('actionscheduler_actions')
                        ->whereIn('status', ['complete', 'failed'])
                        ->where('scheduled_date_gmt', '<', $cutoff);
                })
                ->limit(5000)
                ->delete();
            $totalLogs += $deleted;
        } while ($deleted === 5000);

        $totalActions = 0;
        do {
            $deleted = $conn->table('actionscheduler_actions')
                ->whereIn('status', ['complete', 'failed'])
                ->where('scheduled_date_gmt', '<', $cutoff)
                ->limit(5000)
                ->delete();
            $totalActions += $deleted;
        } while ($deleted === 5000);

        if ($totalActions > 0) {
            $conn->statement('OPTIMIZE TABLE actionscheduler_logs, actionscheduler_actions');
        }

        Log::info("[CleanActionScheduler] run complete, deleted {$totalActions} action(s), {$totalLogs} log row(s)");
        $this->info("Deleted {$totalActions} old action(s) and {$totalLogs} log row(s).");
        return self::SUCCESS;
    }
}
