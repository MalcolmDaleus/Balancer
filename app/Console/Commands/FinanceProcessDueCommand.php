<?php

namespace App\Console\Commands;

use App\Services\FinanceProcessingService;
use Illuminate\Console\Command;

class FinanceProcessDueCommand extends Command
{
    protected $signature = 'finance:process-due
                            {--user= : Process a single user id}
                            {--date= : As-of date (Y-m-d); defaults to today}';

    protected $description = 'Generate due regular income and flush recurring/income pending toggles';

    public function handle(FinanceProcessingService $finance): int
    {
        $asOf = $this->option('date');
        $userId = $this->option('user');

        if ($userId !== null) {
            $ran = $finance->processDueForUser((int) $userId, $asOf);
            $this->info($ran
                ? "Processed due finance work for user {$userId}."
                : "Skipped user {$userId} (lock held).");

            return self::SUCCESS;
        }

        $count = $finance->processDueForAllUsers($asOf);
        $this->info("Processed due finance work for {$count} user(s).");

        return self::SUCCESS;
    }
}
