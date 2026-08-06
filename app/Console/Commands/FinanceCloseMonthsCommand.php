<?php

namespace App\Console\Commands;

use App\Services\FinanceProcessingService;
use Illuminate\Console\Command;

class FinanceCloseMonthsCommand extends Command
{
    protected $signature = 'finance:close-months
                            {--user= : Close months for a single user id}
                            {--as-of= : As-of date (Y-m-d); defaults to today}';

    protected $description = 'Persist balance sheet snapshots for complete unlocked months';

    public function handle(FinanceProcessingService $finance): int
    {
        $asOf = $this->option('as-of');
        $userId = $this->option('user');

        if ($userId !== null) {
            $closed = $finance->closeMonthsForUser((int) $userId, $asOf);

            if ($closed === null) {
                $this->warn("Skipped user {$userId} (lock held).");

                return self::SUCCESS;
            }

            $this->info(count($closed)
                ? 'Closed: '.implode(', ', $closed)
                : "No months to close for user {$userId}.");

            return self::SUCCESS;
        }

        $count = $finance->closeMonthsForAllUsers($asOf);
        $this->info("Ran month close for {$count} user(s).");

        return self::SUCCESS;
    }
}
