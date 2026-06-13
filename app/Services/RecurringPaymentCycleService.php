<?php

namespace App\Services;

use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Recurring payment cycle hooks (pending toggle flush on occurrence days).
 *
 * Unlike income, recurring payments do not materialize ledger rows — the balance
 * sheet sums occurrences per month via OccurrenceCalculatorService.
 */
class RecurringPaymentCycleService
{
    public function __construct(
        private readonly OccurrenceCalculatorService $calculator,
    ) {}

    /**
     * Run cycle processing for a user. Intended on every dashboard visit (idempotent).
     */
    public function processForUser(int $userId, Carbon|string|null $asOf = null): void
    {
        $this->flushPendingToggles($userId, $asOf);
    }

    /**
     * Commit pending_active when today matches a scheduled occurrence for the stream.
     */
    public function flushPendingToggles(int $userId, Carbon|string|null $asOf = null): void
    {
        $today = Carbon::parse($asOf ?? now())->startOfDay();

        RecurringPaymentStream::where('user_id', $userId)
            ->whereNotNull('pending_active')
            ->with(['entries' => fn ($q) => $q->where('active', true)->orderByDesc('start_date')])
            ->get()
            ->each(function (RecurringPaymentStream $stream) use ($today): void {
                $entry = $stream->entries->first();

                if (! $entry) {
                    return;
                }

                $nextOccurrence = $this->calculator->nextRecurringEntryOccurrenceOnOrAfter($entry, $today);

                if ($nextOccurrence === null || ! $nextOccurrence->isSameDay($today)) {
                    return;
                }

                DB::transaction(function () use ($stream): void {
                    $stream->update([
                        'active'         => $stream->pending_active,
                        'pending_active' => null,
                    ]);
                });
            });
    }
}
