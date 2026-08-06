<?php

namespace App\Console\Commands;

use App\Services\FinanceProcessingService;
use Illuminate\Console\Command;

class FinanceSyncCommand extends Command
{
    protected $signature = 'finance:sync
                            {--user= : Required user id to sync}
                            {--date= : As-of date (Y-m-d); defaults to today}';

    protected $description = 'Process due finance work then close months for one user (manual / catch-up)';

    public function handle(FinanceProcessingService $finance): int
    {
        $userId = $this->option('user');

        if ($userId === null) {
            $this->error('The --user option is required.');

            return self::FAILURE;
        }

        $result = $finance->syncUser((int) $userId, $this->option('date'));

        if ($result['skipped']) {
            $this->warn("Skipped user {$userId} (lock held).");

            return self::SUCCESS;
        }

        $closed = $result['closed_months'];
        $this->info("Synced user {$userId}.");
        $this->info(count($closed)
            ? 'Closed: '.implode(', ', $closed)
            : 'No months closed.');

        return self::SUCCESS;
    }
}
