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
 * Horizon: month start through the as-of day (usually today). Later days in the
 * open month stay projected until they come due.
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
        $horizonEnd = $asOf->copy()->startOfDay();

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

        $this->pruneFutureOpenMonthCharges($userId, $asOf);

        return $created;
    }

    /**
     * Drop open-month Facts after as-of so they can show as upcoming again.
     * Does not write skip rows — those dates should still charge when due.
     */
    public function pruneFutureOpenMonthCharges(int $userId, Carbon|string|null $asOf = null): int
    {
        $asOf = Carbon::parse($asOf ?? now())->startOfDay();

        return RecurringCharge::query()
            ->where('user_id', $userId)
            ->whereDate('occurred_on', '>', $asOf->toDateString())
            ->whereDate('occurred_on', '<=', $asOf->copy()->endOfMonth()->toDateString())
            ->get()
            ->each(fn (RecurringCharge $charge) => $charge->delete())
            ->count();
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
            ->whereDate('occurrence_date', '>=', $rangeStart)
            ->whereDate('occurrence_date', '<=', $rangeEnd)
            ->pluck('occurrence_date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip()
            ->all();

        $chargeDates = RecurringCharge::where('recurring_payment_entry_id', $entry->id)
            ->whereDate('occurred_on', '>=', $rangeStart)
            ->whereDate('occurred_on', '<=', $rangeEnd)
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
