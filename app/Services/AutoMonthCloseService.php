<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\Saving;
use Carbon\Carbon;

/**
 * Closes all complete calendar months that do not yet have a snapshot.
 *
 * Intended to run once per session when the user enters the dashboard in a
 * new calendar month — no cron required.
 */
class AutoMonthCloseService
{
    /**
     * Close every unlocked month from the backlog start through the last
     * complete month (current month minus one).
     *
     * After closing, any queued pause/resume changes (pending_active) are
     * committed to the live active column so they take effect in the new month.
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

        // Commit pending toggle changes now that the month boundary has been crossed.
        // This runs even when closing a backlog — the pending state should always
        // reflect the user's intent for the current (open) month.
        if (! empty($result)) {
            $this->flushPendingToggles($userId);
        }

        return $result;
    }

    /**
     * Commit all queued pause/resume changes for the user's recurring streams.
     *
     * Copies pending_active → active and resets pending_active to null.
     * Called automatically after closing months; can also be called directly
     * in tests or future scheduled commands.
     */
    public function flushPendingToggles(int $userId): void
    {
        RecurringPaymentStream::where('user_id', $userId)
            ->whereNotNull('pending_active')
            ->get()
            ->each(function (RecurringPaymentStream $stream): void {
                $stream->update([
                    'active'         => $stream->pending_active,
                    'pending_active' => null,
                ]);
            });
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
            IncomeEntry::where('user_id', $userId)->min('month'),
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
