<?php

namespace App\Services;

use App\Enums\IncomeScheduleFrequency;
use App\Models\RecurringPaymentEntry;
use Carbon\Carbon;

class OccurrenceCalculatorService
{
    /**
     * Return occurrence dates within [rangeStart, rangeEnd] for a versioned schedule.
     *
     * Only dates on or after version start_date and on or after minDate are included.
     */
    public function datesInRange(
        IncomeScheduleFrequency|string $frequency,
        Carbon|string $versionStartDate,
        Carbon|string|null $versionEndDate,
        Carbon|string $rangeStart,
        Carbon|string $rangeEnd,
        Carbon|string $minDate,
        ?int $dayOfMonth = null,
        ?int $dayOfWeek = null,
        Carbon|string|null $anchorDate = null,
    ): array {
        $frequency = $frequency instanceof IncomeScheduleFrequency
            ? $frequency
            : IncomeScheduleFrequency::from($frequency);

        $versionStart = Carbon::parse($versionStartDate)->startOfDay();
        $versionEnd = $versionEndDate ? Carbon::parse($versionEndDate)->startOfDay() : null;
        $from = Carbon::parse($rangeStart)->startOfDay();
        $to = Carbon::parse($rangeEnd)->startOfDay();
        $floor = Carbon::parse($minDate)->startOfDay();

        $effectiveStart = collect([$versionStart, $from, $floor])->max(fn (Carbon $d) => $d->timestamp);
        $effectiveStart = Carbon::createFromTimestamp($effectiveStart)->startOfDay();

        if ($versionEnd !== null && $effectiveStart->gt($versionEnd)) {
            return [];
        }

        if ($effectiveStart->gt($to)) {
            return [];
        }

        $dates = match ($frequency) {
            IncomeScheduleFrequency::Weekly   => $this->weeklyDates($effectiveStart, $to, $versionEnd, $dayOfWeek),
            IncomeScheduleFrequency::Biweekly => $this->biweeklyDates($effectiveStart, $to, $versionEnd, $dayOfWeek, $anchorDate ?? $versionStart),
            default                           => $this->monthlyBasedDates($frequency, $effectiveStart, $to, $versionEnd, $versionStart, $dayOfMonth),
        };

        return array_values(array_filter($dates, function (Carbon $date) use ($versionStart, $versionEnd, $floor) {
            if ($date->lt($versionStart) || $date->lt($floor)) {
                return false;
            }

            if ($versionEnd !== null && $date->gt($versionEnd)) {
                return false;
            }

            return true;
        }));
    }

    /**
     * Next occurrence on or after the given date (used for pending toggle flush).
     */
    public function nextOccurrenceOnOrAfter(
        IncomeScheduleFrequency|string $frequency,
        Carbon|string $versionStartDate,
        Carbon|string|null $versionEndDate,
        Carbon|string $onOrAfter,
        ?int $dayOfMonth = null,
        ?int $dayOfWeek = null,
        Carbon|string|null $anchorDate = null,
    ): ?Carbon {
        $onOrAfter = Carbon::parse($onOrAfter)->startOfDay();
        $horizon = $onOrAfter->copy()->addYear();

        $dates = $this->datesInRange(
            $frequency,
            $versionStartDate,
            $versionEndDate,
            $onOrAfter,
            $horizon,
            $onOrAfter,
            $dayOfMonth,
            $dayOfWeek,
            $anchorDate,
        );

        return $dates[0] ?? null;
    }

    /**
     * Next occurrence on or after the given date for a recurring payment price entry.
     */
    public function nextRecurringEntryOccurrenceOnOrAfter(
        RecurringPaymentEntry $entry,
        Carbon|string $onOrAfter,
    ): ?Carbon {
        return $this->nextOccurrenceOnOrAfter(
            IncomeScheduleFrequency::fromRecurringPayment($entry->frequency),
            $entry->start_date,
            $entry->end_date,
            $onOrAfter,
            $entry->day_of_month,
            $entry->day_of_week,
            $entry->start_date,
        );
    }

    /**
     * Occurrence dates for a recurring payment price entry within a balance-sheet period.
     *
     * Unlike income generation, historical months include all occurrences in the period
     * (minDate = period start, not today).
     *
     * @return list<Carbon>
     */
    public function recurringEntryDatesInPeriod(
        RecurringPaymentEntry $entry,
        Carbon|string $periodStart,
        Carbon|string $periodEnd,
    ): array {
        $periodStart = Carbon::parse($periodStart)->startOfDay();
        $periodEnd = Carbon::parse($periodEnd)->startOfDay();

        return $this->datesInRange(
            IncomeScheduleFrequency::fromRecurringPayment($entry->frequency),
            $entry->start_date,
            $entry->end_date,
            $periodStart,
            $periodEnd,
            $periodStart,
            $entry->day_of_month,
            $entry->day_of_week,
            $entry->start_date,
        );
    }

    /**
     * Total amount charged by a recurring payment entry during a balance-sheet period.
     */
    public function recurringEntryAmountInPeriod(
        RecurringPaymentEntry $entry,
        Carbon|string $periodStart,
        Carbon|string $periodEnd,
    ): float {
        $count = count($this->recurringEntryDatesInPeriod($entry, $periodStart, $periodEnd));

        return round($count * (float) $entry->amount, 2);
    }

    private function weeklyDates(Carbon $from, Carbon $to, ?Carbon $versionEnd, ?int $dayOfWeek): array
    {
        $targetDow = $dayOfWeek ?? $from->dayOfWeek;
        $cursor = $from->copy();

        if ($cursor->dayOfWeek !== $targetDow) {
            $cursor = $cursor->next($targetDow);
        }

        return $this->collectSteppingDates($cursor, $to, $versionEnd, 'week');
    }

    private function biweeklyDates(Carbon $from, Carbon $to, ?Carbon $versionEnd, ?int $dayOfWeek, Carbon|string $anchorDate): array
    {
        $anchor = Carbon::parse($anchorDate)->startOfDay();
        $targetDow = $dayOfWeek ?? $anchor->dayOfWeek;

        $cursor = $anchor->copy();
        if ($cursor->dayOfWeek !== $targetDow) {
            $cursor = $cursor->next($targetDow);
        }

        while ($cursor->lt($from)) {
            $cursor->addWeeks(2);
        }

        return $this->collectSteppingDates($cursor, $to, $versionEnd, 'weeks', 2);
    }

    private function monthlyBasedDates(
        IncomeScheduleFrequency $frequency,
        Carbon $from,
        Carbon $to,
        ?Carbon $versionEnd,
        Carbon $versionStart,
        ?int $dayOfMonth,
    ): array {
        $interval = $frequency->monthInterval();
        $targetDay = $dayOfMonth ?? $versionStart->day;

        $cursor = $this->monthAnchorDate($versionStart, $targetDay);

        while ($cursor->lt($from)) {
            $cursor = $this->monthAnchorDate($cursor->copy()->addMonthsNoOverflow($interval), $targetDay);
        }

        $dates = [];
        while ($cursor->lte($to)) {
            if ($versionEnd === null || $cursor->lte($versionEnd)) {
                $dates[] = $cursor->copy();
            }

            $cursor = $this->monthAnchorDate($cursor->copy()->addMonthsNoOverflow($interval), $targetDay);
        }

        return $dates;
    }

    private function monthAnchorDate(Carbon $month, int $dayOfMonth): Carbon
    {
        $daysInMonth = $month->daysInMonth;
        $day = min($dayOfMonth, $daysInMonth);

        return $month->copy()->startOfMonth()->day($day)->startOfDay();
    }

    private function collectSteppingDates(
        Carbon $cursor,
        Carbon $to,
        ?Carbon $versionEnd,
        string $unit,
        int $step = 1,
    ): array {
        $dates = [];

        while ($cursor->lte($to)) {
            if ($versionEnd === null || $cursor->lte($versionEnd)) {
                $dates[] = $cursor->copy();
            }

            $cursor = match ($unit) {
                'week'  => $cursor->copy()->addWeek(),
                'weeks' => $cursor->copy()->addWeeks($step),
                default => $cursor->copy()->addWeek(),
            };
        }

        return $dates;
    }
}
