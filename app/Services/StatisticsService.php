<?php

namespace App\Services;

use App\Models\BalanceSheetTotal;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\Saving;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Aggregates Facts + snapshots for the Statistics card.
 *
 * Server-side only — the client renders the returned points.
 */
class StatisticsService
{
    public const WINDOWS = [1, 3, 6, 12, 24, 60];

    public const WINDOW_ALL = 'all';

    public const TREND = [
        'leftover' => 'What’s leftover',
        'income_total' => 'Income',
        'spend_net' => 'Purchases',
        'recurring_total' => 'Recurring charges',
        'savings_net' => 'Savings',
        'savings_running' => 'Savings total',
        'recurring_load' => 'Recurring vs income',
    ];

    public const COMPARE = [
        'purchase_categories_month' => 'Purchases by category',
        'purchase_categories_avg' => 'Average by category',
        'outflow_domains_month' => 'Spending by type',
        'leftover_by_month' => 'Leftover by month',
    ];

    public const SHARE = [
        'outflow_mix' => 'How money was used',
        'purchase_categories' => 'Share of purchases',
        'income_mix' => 'Types of income',
    ];

    public function __construct(
        private readonly FinancialFlowReadModel $readModel,
    ) {}

    /**
     * @param  int|string  $window  Month count or "all"
     * @return array{
     *   view: string,
     *   series: string,
     *   label: string,
     *   window: int|string,
     *   from: string,
     *   to: string,
     *   unit: string,
     *   span_months: int,
     *   available_windows: list<int|string>,
     *   points: list<array{month?: string, name?: string, value: float}>
     * }
     */
    public function series(int $userId, string $view, string $series, int|string $window = 12, ?Carbon $asOf = null): array
    {
        $asOf = Carbon::parse($asOf ?? now())->startOfMonth();
        [$from, $to] = $this->windowBounds($userId, $window, $asOf);
        $label = $this->labelFor($view, $series);
        $unit = $series === 'recurring_load' ? 'percent' : 'money';

        $points = match ($view) {
            'trend' => $this->trendPoints($userId, $series, $from, $to),
            'compare' => $this->comparePoints($userId, $series, $from, $to),
            'share' => $this->sharePoints($userId, $series, $from, $to),
            default => throw new InvalidArgumentException("Unknown view [{$view}]"),
        };

        return [
            'view' => $view,
            'series' => $series,
            'label' => $label,
            'window' => $window,
            'from' => $from->format('Y-m'),
            'to' => $to->format('Y-m'),
            'unit' => $unit,
            'span_months' => $this->spanMonths($userId, $asOf),
            'available_windows' => $this->availableWindows($userId, $asOf),
            'points' => $points,
        ];
    }

    /**
     * @param  int|string  $window
     * @return array{
     *   window: int|string,
     *   from: string,
     *   to: string,
     *   span_months: int,
     *   available_windows: list<int|string>,
     *   markers: list<array<string, mixed>>
     * }
     */
    public function markers(int $userId, int|string $window = 12, ?Carbon $asOf = null): array
    {
        $asOf = Carbon::parse($asOf ?? now())->startOfMonth();
        [$from, $to] = $this->windowBounds($userId, $window, $asOf);

        $leftovers = collect($this->leftoverByMonth($userId, $from, $to));
        $thisMonthLeftover = (float) ($leftovers->last()['value'] ?? 0);
        $avgLeftover = $leftovers->isEmpty()
            ? 0.0
            : round($leftovers->avg('value'), 2);

        $best = $leftovers->sortByDesc('value')->first();
        $worst = $leftovers->sortBy('value')->first();

        $monthCats = $this->purchaseCategoryNets($userId, $from, $to);
        $avgCats = $this->purchaseCategoryAverages($userId, $from, $to);
        $top = collect($monthCats)->sortByDesc('value')->first();
        $topName = $top['name'] ?? null;
        $topValue = (float) ($top['value'] ?? 0);
        $topAvg = $topName !== null
            ? (float) (collect($avgCats)->firstWhere('name', $topName)['value'] ?? 0)
            : 0.0;

        $savingsInPeriod = collect($this->domainSignedByMonth($userId, 'savings', $from, $to))->sum();

        $incomeByMonth = $this->domainInByMonth($userId, 'income', $from, $to);
        $recurringByMonth = $this->domainOutByMonth($userId, 'recurring', $from, $to);
        $income = (float) collect($incomeByMonth)->sum();
        $recurring = (float) collect($recurringByMonth)->sum();
        $load = $income > 0 ? round($recurring / $income, 4) : 0.0;

        return [
            'window' => $window,
            'from' => $from->format('Y-m'),
            'to' => $to->format('Y-m'),
            'span_months' => $this->spanMonths($userId, $asOf),
            'available_windows' => $this->availableWindows($userId, $asOf),
            'markers' => [
                [
                    'id' => 'leftover_vs_avg',
                    'label' => 'Leftover vs average',
                    'value' => $thisMonthLeftover,
                    'baseline' => $avgLeftover,
                    'delta' => round($thisMonthLeftover - $avgLeftover, 2),
                    'unit' => 'money',
                ],
                [
                    'id' => 'top_category',
                    'label' => $topName ? "Top category · {$topName}" : 'Top category',
                    'name' => $topName,
                    'value' => $topValue,
                    'baseline' => $topAvg,
                    'delta' => round($topValue - $topAvg, 2),
                    'unit' => 'money',
                ],
                [
                    'id' => 'savings_this_month',
                    'label' => 'Savings in period',
                    'value' => round((float) $savingsInPeriod, 2),
                    'unit' => 'money',
                ],
                [
                    'id' => 'recurring_load',
                    'label' => 'Recurring load',
                    'value' => $load,
                    'unit' => 'percent',
                ],
                [
                    'id' => 'best_leftover_month',
                    'label' => 'Best leftover month',
                    'month' => $best['month'] ?? null,
                    'value' => (float) ($best['value'] ?? 0),
                    'unit' => 'money',
                ],
                [
                    'id' => 'worst_leftover_month',
                    'label' => 'Worst leftover month',
                    'month' => $worst['month'] ?? null,
                    'value' => (float) ($worst['value'] ?? 0),
                    'unit' => 'money',
                ],
            ],
        ];
    }

    /**
     * @param  mixed  $raw
     */
    public static function parseWindow(mixed $raw): int|string
    {
        if ($raw === null || $raw === '') {
            return 12;
        }

        if ($raw === self::WINDOW_ALL) {
            return self::WINDOW_ALL;
        }

        return (int) $raw;
    }

    /**
     * Inclusive months from earliest activity through as-of. Zero when there is no activity.
     */
    public function spanMonths(int $userId, Carbon $asOf): int
    {
        $earliest = $this->earliestMonth($userId);
        if ($earliest === null) {
            return 0;
        }

        $asOf = $asOf->copy()->startOfMonth();
        if ($earliest->gt($asOf)) {
            return 0;
        }

        return (($asOf->year - $earliest->year) * 12) + ($asOf->month - $earliest->month) + 1;
    }

    /**
     * Numeric ranges the history can fill, plus all-time (always present).
     *
     * @return list<int|string>
     */
    public function availableWindows(int $userId, Carbon $asOf): array
    {
        $span = $this->spanMonths($userId, $asOf);
        $windows = [];

        foreach (self::WINDOWS as $months) {
            if ($span >= $months) {
                $windows[] = $months;
            }
        }

        $windows[] = self::WINDOW_ALL;

        return $windows;
    }

    /**
     * @param  int|string  $window
     * @return array{0: Carbon, 1: Carbon}
     */
    public function windowBounds(int $userId, int|string $window, Carbon $asOf): array
    {
        $to = $asOf->copy()->startOfMonth();

        if ($window === self::WINDOW_ALL) {
            $from = $this->earliestMonth($userId) ?? $to;

            return [$from->copy()->startOfMonth(), $to];
        }

        $window = (int) $window;
        if (! in_array($window, self::WINDOWS, true)) {
            throw new InvalidArgumentException("Unknown window [{$window}]");
        }

        $from = $to->copy()->subMonthsNoOverflow($window - 1)->startOfMonth();

        return [$from, $to];
    }

    private function earliestMonth(int $userId): ?Carbon
    {
        $candidates = array_filter([
            Purchase::query()->where('user_id', $userId)->min('date'),
            IncomeEntry::query()->where('user_id', $userId)->min('received_at'),
            RecurringCharge::query()->where('user_id', $userId)->min('occurred_on'),
            DebtPayment::query()->where('user_id', $userId)->min('paid_at'),
            Saving::query()->where('user_id', $userId)->min('month'),
            BalanceSheetTotal::query()->where('user_id', $userId)->min('month'),
        ], fn ($value) => $value !== null && $value !== '');

        if ($candidates === []) {
            return null;
        }

        return Carbon::parse(min($candidates))->startOfMonth();
    }

    public function labelFor(string $view, string $series): string
    {
        $map = match ($view) {
            'trend' => self::TREND,
            'compare' => self::COMPARE,
            'share' => self::SHARE,
            default => [],
        };

        return $map[$series] ?? $series;
    }

    /**
     * @return list<array{month: string, value: float}>
     */
    private function trendPoints(int $userId, string $series, Carbon $from, Carbon $to): array
    {
        $keys = $this->monthKeys($from, $to);

        $values = match ($series) {
            'leftover' => collect($this->leftoverByMonth($userId, $from, $to))->pluck('value', 'month'),
            'income_total' => collect($this->domainInByMonth($userId, 'income', $from, $to)),
            'spend_net' => collect($this->spendNetByMonth($userId, $from, $to)),
            'recurring_total' => collect($this->domainOutByMonth($userId, 'recurring', $from, $to)),
            'savings_net' => collect($this->domainSignedByMonth($userId, 'savings', $from, $to)),
            'savings_running' => collect($this->savingsRunningByMonth($userId, $keys)),
            'recurring_load' => collect($this->recurringLoadByMonth($userId, $from, $to)),
            default => throw new InvalidArgumentException("Unknown trend series [{$series}]"),
        };

        return collect($keys)
            ->map(fn (string $ym) => [
                'month' => $ym,
                'value' => round((float) ($values[$ym] ?? 0), $series === 'recurring_load' ? 4 : 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{name: string, value: float, month?: string}>
     */
    private function comparePoints(int $userId, string $series, Carbon $from, Carbon $to): array
    {
        return match ($series) {
            'purchase_categories_month' => $this->purchaseCategoryNets($userId, $from, $to),
            'purchase_categories_avg' => $this->purchaseCategoryAverages($userId, $from, $to),
            'outflow_domains_month' => $this->outflowDomains($userId, $from, $to),
            'leftover_by_month' => collect($this->leftoverByMonth($userId, $from, $to))
                ->map(fn (array $row) => [
                    'name' => $row['month'],
                    'month' => $row['month'],
                    'value' => $row['value'],
                ])
                ->values()
                ->all(),
            default => throw new InvalidArgumentException("Unknown compare series [{$series}]"),
        };
    }

    /**
     * @return list<array{name: string, value: float}>
     */
    private function sharePoints(int $userId, string $series, Carbon $from, Carbon $to): array
    {
        $points = match ($series) {
            'outflow_mix' => $this->outflowDomains($userId, $from, $to),
            'purchase_categories' => $this->purchaseCategoryNets($userId, $from, $to),
            'income_mix' => $this->incomeMix($userId, $from, $to),
            default => throw new InvalidArgumentException("Unknown share series [{$series}]"),
        };

        return collect($points)
            ->filter(fn (array $row) => $row['value'] > 0)
            ->values()
            ->all();
    }

    /**
     * @return list<array{month: string, value: float}>
     */
    private function leftoverByMonth(int $userId, Carbon $from, Carbon $to): array
    {
        return collect($this->monthKeys($from, $to))
            ->map(function (string $ym) use ($userId) {
                $sheet = (new BalanceSheetService($userId, $ym))->getSimplified();

                return [
                    'month' => $ym,
                    'value' => (float) $sheet['roll_over'],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, float>
     */
    private function domainInByMonth(int $userId, string $domain, Carbon $from, Carbon $to): array
    {
        return $this->sumFactsByMonth(
            $this->readModel->forUser($userId, $from, $to->copy()->endOfMonth()),
            fn (array $f) => $f['domain'] === $domain && $f['direction'] === 'in',
        );
    }

    /**
     * @return array<string, float>
     */
    private function domainOutByMonth(int $userId, string $domain, Carbon $from, Carbon $to): array
    {
        return $this->sumFactsByMonth(
            $this->readModel->forUser($userId, $from, $to->copy()->endOfMonth()),
            fn (array $f) => $f['domain'] === $domain && $f['direction'] === 'out',
        );
    }

    /**
     * Signed: in minus out (savings deposits − withdrawals).
     *
     * @return array<string, float>
     */
    private function domainSignedByMonth(int $userId, string $domain, Carbon $from, Carbon $to): array
    {
        $facts = $this->readModel->forUser($userId, $from, $to->copy()->endOfMonth());
        $totals = [];

        foreach ($this->monthKeys($from, $to) as $ym) {
            $totals[$ym] = 0.0;
        }

        foreach ($facts as $fact) {
            if ($fact['domain'] !== $domain || $fact['occurred_on'] === null) {
                continue;
            }
            $ym = Carbon::parse($fact['occurred_on'])->format('Y-m');
            if (! array_key_exists($ym, $totals)) {
                continue;
            }
            $signed = $fact['direction'] === 'out' ? -((float) $fact['amount']) : (float) $fact['amount'];
            $totals[$ym] = round($totals[$ym] + $signed, 2);
        }

        return $totals;
    }

    /**
     * @return array<string, float>
     */
    private function spendNetByMonth(int $userId, Carbon $from, Carbon $to): array
    {
        $nets = [];
        foreach ($this->monthKeys($from, $to) as $ym) {
            $nets[$ym] = 0.0;
        }

        foreach ($this->purchaseNets($userId, $from, $to) as $row) {
            $ym = $row['month'];
            if (array_key_exists($ym, $nets)) {
                $nets[$ym] = round($nets[$ym] + $row['net'], 2);
            }
        }

        return $nets;
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, float>
     */
    private function savingsRunningByMonth(int $userId, array $keys): array
    {
        $out = [];
        foreach ($keys as $ym) {
            $asOf = Carbon::createFromFormat('Y-m', $ym)->startOfMonth()->toDateString();
            $out[$ym] = round(Saving::runningBalance($userId, $asOf), 2);
        }

        return $out;
    }

    /**
     * @return array<string, float>
     */
    private function recurringLoadByMonth(int $userId, Carbon $from, Carbon $to): array
    {
        $income = $this->domainInByMonth($userId, 'income', $from, $to);
        $recurring = $this->domainOutByMonth($userId, 'recurring', $from, $to);
        $out = [];

        foreach ($this->monthKeys($from, $to) as $ym) {
            $in = $income[$ym] ?? 0.0;
            $out[$ym] = $in > 0 ? round(($recurring[$ym] ?? 0.0) / $in, 4) : 0.0;
        }

        return $out;
    }

    /**
     * @return list<array{name: string, value: float}>
     */
    private function purchaseCategoryNets(int $userId, Carbon $from, Carbon $to): array
    {
        return collect($this->purchaseNets($userId, $from, $to))
            ->groupBy('category')
            ->map(fn (Collection $rows, string $name) => [
                'name' => $name,
                'value' => round((float) $rows->sum('net'), 2),
            ])
            ->filter(fn (array $row) => $row['value'] != 0.0)
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    /**
     * @return list<array{name: string, value: float}>
     */
    private function purchaseCategoryAverages(int $userId, Carbon $from, Carbon $to): array
    {
        $monthCount = max(1, count($this->monthKeys($from, $to)));

        return collect($this->purchaseCategoryNets($userId, $from, $to))
            ->map(fn (array $row) => [
                'name' => $row['name'],
                'value' => round($row['value'] / $monthCount, 2),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{name: string, value: float}>
     */
    private function outflowDomains(int $userId, Carbon $from, Carbon $to): array
    {
        $purchases = round((float) collect($this->domainOutByMonth($userId, 'spending', $from, $to))->sum(), 2);
        $recurring = round((float) collect($this->domainOutByMonth($userId, 'recurring', $from, $to))->sum(), 2);
        $debt = round((float) collect($this->domainOutByMonth($userId, 'debt', $from, $to))->sum(), 2);

        $savingsDeposits = round((float) Saving::query()
            ->where('user_id', $userId)
            ->where('type', 'deposit')
            ->whereDate('month', '>=', $from->toDateString())
            ->whereDate('month', '<=', $to->toDateString())
            ->sum('amount'), 2);

        return [
            ['name' => 'Purchases', 'value' => $purchases],
            ['name' => 'Recurring', 'value' => $recurring],
            ['name' => 'Debt payments', 'value' => $debt],
            ['name' => 'Savings deposits', 'value' => $savingsDeposits],
        ];
    }

    /**
     * @return list<array{name: string, value: float}>
     */
    private function incomeMix(int $userId, Carbon $from, Carbon $to): array
    {
        $facts = $this->readModel->forUser(
            $userId,
            $from->copy()->startOfMonth(),
            $to->copy()->endOfMonth(),
        );

        $totals = [
            'regular' => 0.0,
            'irregular' => 0.0,
            'refund' => 0.0,
        ];

        foreach ($facts as $fact) {
            if ($fact['domain'] !== 'income') {
                continue;
            }
            $kind = $fact['kind'] ?? 'irregular';
            if (! array_key_exists($kind, $totals)) {
                $totals[$kind] = 0.0;
            }
            $totals[$kind] = round($totals[$kind] + (float) $fact['amount'], 2);
        }

        return [
            ['name' => 'Regular', 'value' => $totals['regular']],
            ['name' => 'Irregular', 'value' => $totals['irregular']],
            ['name' => 'Refund', 'value' => $totals['refund']],
        ];
    }

    /**
     * Economic net: refunds reduce the purchase month/category, not the refund month.
     *
     * @return list<array{month: string, category: string, net: float}>
     */
    private function purchaseNets(int $userId, Carbon $from, Carbon $to): array
    {
        $purchases = Purchase::query()
            ->where('user_id', $userId)
            ->with(['category', 'refundIncomeEntries'])
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->copy()->endOfMonth()->toDateString())
            ->get();

        return $purchases->map(function (Purchase $p) {
            $refunded = (float) $p->refundIncomeEntries->sum('amount');

            return [
                'month' => $p->date?->format('Y-m') ?? '',
                'category' => $p->category?->name ?? 'Uncategorized',
                'net' => round((float) $p->amount - $refunded, 2),
            ];
        })->all();
    }

    /**
     * @param  callable(array<string, mixed>): bool  $filter
     * @return array<string, float>
     */
    private function sumFactsByMonth(Collection $facts, callable $filter): array
    {
        $totals = [];

        foreach ($facts as $fact) {
            if (! $filter($fact) || $fact['occurred_on'] === null) {
                continue;
            }
            $ym = Carbon::parse($fact['occurred_on'])->format('Y-m');
            $totals[$ym] = round(($totals[$ym] ?? 0) + (float) $fact['amount'], 2);
        }

        return $totals;
    }

    /**
     * @return list<string>
     */
    private function monthKeys(Carbon $from, Carbon $to): array
    {
        $keys = [];
        $cursor = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $keys[] = $cursor->format('Y-m');
            $cursor->addMonthNoOverflow();
        }

        return $keys;
    }
}
