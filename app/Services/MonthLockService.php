<?php

namespace App\Services;

use App\Exceptions\MonthLockedException;
use App\Models\BalanceSheetTotal;
use Carbon\Carbon;

/**
 * Class MonthLockService
 *
 * Single source of truth for month-close/immutability checks.
 *
 * A month is considered "locked" once a BalanceSheetTotal row exists for it.
 * Any attempt to write financial data (purchases, income entries, debt
 * payments, savings) for a locked month must go through assertUnlocked()
 * before the write is permitted.
 *
 * Usage in controllers / FormRequests:
 *
 *   MonthLockService::assertUnlocked($userId, $request->input('month'));
 *
 * Usage in commands / background jobs:
 *
 *   if (MonthLockService::isLocked($userId, $date)) { ... skip ... }
 */
class MonthLockService
{
    /**
     * Returns true if a BalanceSheetTotal exists for the given user + month.
     *
     * @param int              $userId
     * @param Carbon|string    $month   Any value parseable by DateTimeService::normalizeMonth()
     */
    public static function isLocked(int $userId, Carbon|string $month): bool
    {
        return BalanceSheetTotal::where('user_id', $userId)
            ->whereDate('month', DateTimeService::normalizeMonth($month)->toDateString())
            ->exists();
    }

    /**
     * Throws MonthLockedException (HTTP 423) if the month is locked.
     * Call this at the start of any write operation that touches month data.
     *
     * @param int           $userId
     * @param Carbon|string $month
     *
     * @throws MonthLockedException
     */
    public static function assertUnlocked(int $userId, Carbon|string $month): void
    {
        if (static::isLocked($userId, $month)) {
            throw new MonthLockedException(DateTimeService::normalizeMonth($month));
        }
    }

    /**
     * Convenience: resolve the "month" from a datetime value.
     * Useful when the model stores a datetime (e.g. debt_payments.paid_at)
     * and we need to derive the month lock check from it.
     *
     * @param Carbon|string $datetime
     * @return Carbon  First day of the month at UTC midnight
     */
    public static function monthOf(Carbon|string $datetime): Carbon
    {
        return DateTimeService::normalizeMonth($datetime);
    }
}
