<?php

namespace App\Services;

use App\Exceptions\DomainException;
use App\Models\BalanceSheetTotal;
use App\Models\RecurringPaymentStream;
use App\Models\RegularIncomeSchedule;
use Carbon\Carbon;

/**
 * Guards permanent delete of soft-archived instruments (streams / schedules).
 *
 * Unified stricter policy:
 * - locked_month (423) if the instrument contributed during a closed month
 * - has_facts (422) if any Facts exist (charges for streams; income entries for schedules)
 */
class InstrumentHardDeleteService
{
    /**
     * @throws DomainException locked_month|has_facts
     */
    public function assertCanHardDeleteStream(RecurringPaymentStream $stream): void
    {
        $latestLocked = BalanceSheetTotal::where('user_id', $stream->user_id)->max('month');

        if ($latestLocked) {
            $latestLockedEnd = Carbon::parse($latestLocked)->endOfMonth()->toDateString();
            $hasLockedEntries = $stream->entries()->withTrashed()
                ->where('start_date', '<=', $latestLockedEnd)
                ->exists();

            if ($hasLockedEntries) {
                throw new DomainException(
                    'locked_month',
                    'This stream has appeared in a closed balance sheet and cannot be permanently deleted.',
                    423,
                );
            }
        }

        if ($stream->charges()->exists()) {
            throw new DomainException(
                'has_facts',
                'This stream has charged Facts and cannot be permanently deleted. Soft-archive it instead.',
            );
        }
    }

    /**
     * @throws DomainException locked_month|has_facts
     */
    public function assertCanHardDeleteSchedule(RegularIncomeSchedule $schedule): void
    {
        $latestLocked = BalanceSheetTotal::where('user_id', $schedule->user_id)->max('month');

        if ($latestLocked) {
            $latestLockedEnd = Carbon::parse($latestLocked)->endOfMonth()->toDateString();
            $hasLockedEntries = $schedule->entries()
                ->whereDate('received_at', '<=', $latestLockedEnd)
                ->exists();

            if ($hasLockedEntries) {
                throw new DomainException(
                    'locked_month',
                    'This schedule has appeared in a closed balance sheet and cannot be permanently deleted.',
                    423,
                );
            }
        }

        if ($schedule->entries()->exists()) {
            throw new DomainException(
                'has_facts',
                'This schedule has income Facts and cannot be permanently deleted. Soft-archive it instead.',
            );
        }
    }
}
