<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringPaymentEntry;
use App\Models\Saving;
use Carbon\Carbon;

/**
 * Closes all complete calendar months that do not yet have a snapshot.
 *
 * Invoked from FinanceProcessingService / finance:close-months (cron primary).
 * Dashboard catch-up may also call this path until host cron is verified.
 */
class AutoMonthCloseService
{
    /**
     * Close every unlocked month from the backlog start through the last
     * complete month (current month minus one).
     *
     * @return list<string> Closed months as YYYY-MM, oldest first.
     */
    public function closePendingMonths(int $userId, Carbon|string|null $asOf = null): array
    {
        $currentMonth = DateTimeService::normalizeMonth($asOf);
        $lastComplete = $currentMonth->copy()->subMonth();
        $backlogStart = $this->backlogStartMonth($userId, $lastComplete);

        if ($lastComplete->lt($backlogStart)) {
            return [];
        }

        $closed = [];
        $month = $lastComplete->copy();

        while ($month->gte($backlogStart)) {
            if (! MonthLockService::isLocked($userId, $month)) {
                $svc = new BalanceSheetService($userId, $month);
                $svc->persistSnapshot();
                $closed[] = $month->format('Y-m');
            }

            $month->subMonth();
        }

        $result = array_reverse($closed);

        return $result;
    }

    /**
     * Earliest month that may be auto-closed for this user.
     *
     * New users with no activity: only the immediately previous month.
     * Users with history: from their earliest financial activity onward.
     */
    private function backlogStartMonth(int $userId, Carbon $lastComplete): Carbon
    {
        $earliestDates = [
            Purchase::where('user_id', $userId)->min('date'),
            IncomeEntry::where('user_id', $userId)->min('received_at'),
            Saving::where('user_id', $userId)->min('month'),
            Debt::where('user_id', $userId)->min('issue_date'),
            DebtPayment::where('user_id', $userId)->min('paid_at'),
            RecurringPaymentEntry::where('user_id', $userId)->min('start_date'),
        ];

        $activityMonths = [];

        foreach ($earliestDates as $date) {
            if ($date !== null) {
                $activityMonths[] = DateTimeService::normalizeMonth($date);
            }
        }

        if ($activityMonths === []) {
            return $lastComplete->copy();
        }

        return collect($activityMonths)
            ->sortBy(fn (Carbon $m) => $m->timestamp)
            ->first();
    }
}
