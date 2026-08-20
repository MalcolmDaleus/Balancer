<?php

namespace App\Services;

use App\Models\RecurringCharge;
use App\Models\RecurringOccurrenceSkip;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Log;

/**
 * Materialize recurring charges as RecurringCharge Facts.
 *
 * Horizon: as-of date through end of that calendar month (aligned with income).
 * Catch-up for past due days in the open month is included when as-of is mid-month
 * by also covering month-start → as-of (union with as-of → month-end = full open month).
 */
class RecurringPaymentMaterializationService
{
    public function __construct(
        private readonly OccurrenceCalculatorService $calculator,
    ) {}

    /**
     * @return int Number of charges newly created
     */
    public function materializeForUser(int $userId, Carbon|string|null $asOf = null): int
    {
        $asOf = Carbon::parse($asOf ?? now())->startOfDay();
        $monthStart = $asOf->copy()->startOfMonth();
        $horizonEnd = $asOf->copy()->endOfMonth()->startOfDay();

        $streams = RecurringPaymentStream::where('user_id', $userId)
            ->where('active', true)
            ->whereNotNull('recurring_payment_category_id')
            ->with([
                'category',
                'entries' => fn ($q) => $q->where('active', true)->orderByDesc('start_date'),
            ])
            ->get();

        $created = 0;

        foreach ($streams as $stream) {
            if ($stream->category === null) {
                Log::warning('Skipping recurring materialization; no category', [
                    'user_id'   => $userId,
                    'stream_id' => $stream->id,
                ]);

                continue;
            }

            foreach ($stream->entries as $entry) {
                $created += $this->materializeEntry(
                    $stream,
                    $entry,
                    $monthStart,
                    $horizonEnd,
                );
            }
        }

        return $created;
    }

    /**
     * Remove open-month future Facts after an instrument is deactivated
     * (dates after as-of). Past/due charges in the month are kept.
     */
    public function removeFutureChargesForStream(
        RecurringPaymentStream $stream,
        Carbon|string|null $asOf = null,
    ): int {
        $asOf = Carbon::parse($asOf ?? now())->startOfDay();

        return RecurringCharge::where('recurring_payment_stream_id', $stream->id)
            ->whereDate('occurred_on', '>', $asOf->toDateString())
            ->whereDate('occurred_on', '<=', $asOf->copy()->endOfMonth()->toDateString())
            ->get()
            ->each(fn (RecurringCharge $charge) => $charge->delete())
            ->count();
    }

    private function materializeEntry(
        RecurringPaymentStream $stream,
        RecurringPaymentEntry $entry,
        Carbon $monthStart,
        Carbon $horizonEnd,
    ): int {
        $dates = $this->calculator->recurringEntryDatesInPeriod($entry, $monthStart, $horizonEnd);
        $created = 0;

        $rangeStart = $monthStart->toDateString();
        $rangeEnd = $horizonEnd->toDateString();

        $skipDates = RecurringOccurrenceSkip::where('recurring_payment_entry_id', $entry->id)
            ->whereBetween('occurrence_date', [$rangeStart, $rangeEnd])
            ->pluck('occurrence_date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip()
            ->all();

        $chargeDates = RecurringCharge::where('recurring_payment_entry_id', $entry->id)
            ->whereBetween('occurred_on', [$rangeStart, $rangeEnd])
            ->pluck('occurred_on')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip()
            ->all();

        foreach ($dates as $date) {
            $occurrenceDate = $date->toDateString();

            if (isset($skipDates[$occurrenceDate])) {
                continue;
            }

            if (isset($chargeDates[$occurrenceDate])) {
                continue;
            }

            try {
                RecurringCharge::create([
                    'user_id'                       => $stream->user_id,
                    'recurring_payment_entry_id'    => $entry->id,
                    'recurring_payment_stream_id'   => $stream->id,
                    'recurring_payment_category_id' => $stream->recurring_payment_category_id,
                    'stream_name'                   => $stream->name,
                    'category_name'                 => $stream->category?->name,
                    'amount'                        => $entry->amount,
                    'occurred_on'                   => $occurrenceDate,
                ]);
                $created++;
                $chargeDates[$occurrenceDate] = true;
            } catch (UniqueConstraintViolationException) {
                // Concurrent materializer already created this occurrence.
            }
        }

        return $created;
    }
}
