<?php

namespace App\Services;

use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Recurring payment cycle hooks (pending toggle flush on occurrence days).
 *
 * Materialization runs in RecurringPaymentMaterializationService before this
 * flush so occurrence-day pause is charge-then-pause. After pause, future
 * open-month Facts (dates after as-of) are removed.
 *
 * Primary trigger: FinanceProcessingService / finance:process-due.
 */
class RecurringPaymentCycleService
{
    public function __construct(
        private readonly OccurrenceCalculatorService $calculator,
        private readonly RecurringPaymentMaterializationService $materializer,
    ) {}

    /**
     * Run cycle processing for a user. Idempotent.
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

                DB::transaction(function () use ($stream, $today): void {
                    $becomingInactive = $stream->pending_active === false;

                    $stream->update([
                        'active'         => $stream->pending_active,
                        'pending_active' => null,
                    ]);

                    if ($becomingInactive) {
                        $this->materializer->removeFutureChargesForStream($stream, $today);
                    }
                });
            });
    }
}
