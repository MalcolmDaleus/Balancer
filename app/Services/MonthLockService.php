<?php

namespace App\Services;

use App\Exceptions\MonthLockedException;
use App\Models\BalanceSheetTotal;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
     * @param  Carbon|string  $month  Any value parseable by DateTimeService::normalizeMonth()
     */
    public static function isLocked(int $userId, Carbon|string $month): bool
    {
        return BalanceSheetTotal::where('user_id', $userId)
            ->whereDate('month', DateTimeService::normalizeMonth($month)->toDateString())
            ->exists();
    }

    /**
     * All locked months for a user as YYYY-MM strings (oldest first).
     *
     * @return list<string>
     */
    public static function lockedMonthKeys(int $userId): array
    {
        return BalanceSheetTotal::where('user_id', $userId)
            ->orderBy('month')
            ->get()
            ->map(fn (BalanceSheetTotal $row) => DateTimeService::normalizeMonth($row->month)->format('Y-m'))
            ->values()
            ->all();
    }

    /**
     * True when a classifier (category) is referenced by rows whose date falls
     * in a locked month — evaluated in SQL (no loading all domain rows into PHP).
     *
     * @param  bool  $includeSoftDeleted  When true and the table has deleted_at, include trashed rows.
     */
    public static function classifierUsedInLockedMonth(
        int $userId,
        string $table,
        string $categoryColumn,
        string $dateColumn,
        int $categoryId,
        bool $includeSoftDeleted = false,
    ): bool {
        $keys = static::lockedMonthKeys($userId);

        if ($keys === []) {
            return false;
        }

        $query = DB::table($table)
            ->where("{$table}.user_id", $userId)
            ->where("{$table}.{$categoryColumn}", $categoryId);

        if (! $includeSoftDeleted && Schema::hasColumn($table, 'deleted_at')) {
            $query->whereNull("{$table}.deleted_at");
        }

        $query->where(function ($q) use ($keys, $table, $dateColumn) {
            foreach ($keys as $ym) {
                $start = Carbon::createFromFormat('Y-m', $ym)->startOfMonth();
                $end = $start->copy()->endOfMonth();
                $q->orWhereBetween("{$table}.{$dateColumn}", [
                    $start->toDateTimeString(),
                    $end->toDateTimeString(),
                ]);
            }
        });

        return $query->exists();
    }

    /**
     * Throws MonthLockedException (HTTP 423) if the month is locked.
     * Call this at the start of any write operation that touches month data.
     *
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
     * @return Carbon First day of the month at UTC midnight
     */
    public static function monthOf(Carbon|string $datetime): Carbon
    {
        return DateTimeService::normalizeMonth($datetime);
    }
}
