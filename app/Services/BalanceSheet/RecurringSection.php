<?php

namespace App\Services\BalanceSheet;

use App\Models\RecurringCharge;
use App\Services\DateTimeService;
use App\Services\MoneyService;
use App\Services\OccurrenceCalculatorService;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Charged + projected recurring groupings for the expanded balance sheet.
 * Money fields are integer cents.
 */
final class RecurringSection
{
    private ?OccurrenceCalculatorService $occurrenceCalculator = null;

    public function __construct(
        private readonly PeriodContext $ctx,
        private readonly PeriodFactRepository $facts,
    ) {}

    /**
     * Group materialized recurring charge Facts by stream.
     * Uses stamped names on Facts so closed months stay stable after instrument rename.
     */
    public function chargedGrouped(): Collection
    {
        return $this->facts->recurringCharges()
            ->groupBy(fn (RecurringCharge $c) => $c->recurring_payment_stream_id)
            ->map(function (Collection $group, $streamId) {
                $first = $group->first();
                $entry = $first->entry;

                $items = $group->map(function (RecurringCharge $c) use ($entry) {
                    $cents = MoneyCents::fromMajor($c->amount);

                    return [
                        'id' => $c->recurring_payment_entry_id,
                        'charge_id' => $c->id,
                        'amount_cents' => $cents,
                        'frequency' => $entry?->frequency,
                        'day_of_month' => $entry?->day_of_month,
                        'day_of_week' => $entry?->day_of_week,
                        'occurrence_count' => 1,
                        'period_total_cents' => $cents,
                        'charged_date' => DateTimeService::formatForUI($c->occurred_on, 'short'),
                    ];
                })->values();

                return [
                    'stream_id' => $streamId ?: null,
                    'stream_name' => $first->stream_name,
                    'category_id' => $first->recurring_payment_category_id,
                    'category_name' => $first->category_name ?? 'Uncategorized',
                    'total_cents' => MoneyService::sum($items->pluck('period_total_cents')->toArray()),
                    'entries' => $items,
                ];
            })
            ->filter(fn ($stream) => $stream['entries']->isNotEmpty())
            ->values();
    }

    /**
     * Remaining scheduled occurrences not yet materialized through period end (display only).
     */
    public function projectedGrouped(): Collection
    {
        $window = $this->projectionWindow();
        if ($window === null) {
            return collect();
        }

        [$from] = $window;
        $calculator = $this->occurrenceCalculator();
        $chargedDatesByEntry = $this->chargedDatesByEntry();

        return $this->facts->recurringEntries()
            ->groupBy(fn ($e) => $e->recurring_payment_stream_id)
            ->map(function ($group, $streamId) use ($calculator, $from, $chargedDatesByEntry) {
                $stream = $group->first()->stream ?? null;
                $category = $stream?->category ?? null;

                $items = $group->map(function ($e) use ($calculator, $from, $chargedDatesByEntry) {
                    $dates = $calculator->recurringEntryDatesInPeriod($e, $from, $this->ctx->periodEnd);
                    $existing = $chargedDatesByEntry->get($e->id, []);
                    $dates = array_values(array_filter(
                        $dates,
                        fn (Carbon $d) => ! in_array($d->toDateString(), $existing, true)
                    ));
                    $unit = MoneyCents::fromMajor($e->amount);
                    $periodTotal = $unit * count($dates);

                    return [
                        'id' => $e->id,
                        'amount_cents' => $unit,
                        'frequency' => $e->frequency,
                        'day_of_month' => $e->day_of_month,
                        'day_of_week' => $e->day_of_week,
                        'occurrence_count' => count($dates),
                        'period_total_cents' => $periodTotal,
                    ];
                })
                    ->filter(fn ($item) => $item['occurrence_count'] > 0)
                    ->values();

                return [
                    'stream_id' => $streamId,
                    'stream_name' => $stream?->name ?? 'Unknown',
                    'category_id' => $category?->id,
                    'category_name' => $category?->name ?? 'Uncategorized',
                    'total_cents' => MoneyService::sum($items->pluck('period_total_cents')->toArray()),
                    'entries' => $items,
                ];
            })
            ->filter(fn ($stream) => $stream['entries']->isNotEmpty())
            ->values();
    }

    /**
     * Dated remaining charges in the open month, tomorrow through period end.
     *
     * @return Collection<int, array{name: string, date: string, amount_cents: int, stream_id: int|null, category_id: int|null, category_name: string|null}>
     */
    public function upcomingOccurrences(): Collection
    {
        $window = $this->projectionWindow();
        if ($window === null) {
            return collect();
        }

        [$from] = $window;
        $calculator = $this->occurrenceCalculator();
        $chargedDatesByEntry = $this->chargedDatesByEntry();

        $items = collect();
        foreach ($this->facts->recurringEntries() as $entry) {
            $existing = $chargedDatesByEntry->get($entry->id, []);
            $dates = array_values(array_filter(
                $calculator->recurringEntryDatesInPeriod($entry, $from, $this->ctx->periodEnd),
                fn (Carbon $date) => ! in_array($date->toDateString(), $existing, true)
            ));
            $unit = MoneyCents::fromMajor($entry->amount);
            $stream = $entry->stream;
            $name = $stream?->name ?? 'Unknown';

            foreach ($dates as $date) {
                $items->push([
                    'name' => $name,
                    'date' => $date->toDateString(),
                    'amount_cents' => $unit,
                    'stream_id' => $stream?->id,
                    'category_id' => $stream?->recurring_payment_category_id,
                    'category_name' => $stream?->category?->name,
                ]);
            }
        }

        return $items
            ->sortBy(fn (array $row) => $row['date'].'|'.$row['name'])
            ->values();
    }

    /**
     * @return array{0: Carbon, 1: Carbon}|null
     */
    private function projectionWindow(): ?array
    {
        $today = DateTimeService::today();
        $projectionStart = $today->copy()->addDay()->startOfDay();

        if ($projectionStart->gt($this->ctx->periodEnd) || $this->ctx->periodEnd->lt($today)) {
            return null;
        }

        $from = $projectionStart->gt($this->ctx->periodStart)
            ? $projectionStart
            : $this->ctx->periodStart->copy();

        return [$from, $this->ctx->periodEnd];
    }

    /**
     * @return Collection<int|string, list<string>>
     */
    private function chargedDatesByEntry(): Collection
    {
        return $this->facts->recurringCharges()
            ->groupBy('recurring_payment_entry_id')
            ->map(fn (Collection $group) => $group
                ->map(fn (RecurringCharge $charge) => $charge->occurred_on->toDateString())
                ->all());
    }

    private function occurrenceCalculator(): OccurrenceCalculatorService
    {
        return $this->occurrenceCalculator ??= app(OccurrenceCalculatorService::class);
    }
}
