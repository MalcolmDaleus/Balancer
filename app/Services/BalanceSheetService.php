<?php

namespace App\Services;

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\RecurringPaymentEntry;
use App\Models\Saving;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Class BalanceSheetService
 *
 * Instance-based service that aggregates, computes and returns both
 * simplified and expanded balance sheet objects for a given user + month.
 */
class BalanceSheetService
{
    public readonly int $userId;
    public readonly Carbon $month;            // normalized to first day of month UTC
    public readonly Carbon $periodStart;      // month start UTC
    public readonly Carbon $periodEnd;        // month end UTC

    /** Cached collections */
    protected ?Collection $purchases = null;
    protected ?Collection $recurringCharges = null;
    protected ?Collection $incomeEntries = null;
    protected ?Collection $debts = null;
    protected ?Collection $savings = null;
    protected ?Collection $recurringEntries = null;
    protected ?OccurrenceCalculatorService $occurrenceCalculator = null;

    /**
     * Constructor.
     *
     * @param int $userId
     * @param string|Carbon|null $month  // null means current month
     */
    public function __construct(int $userId, Carbon|string|null $month = null)
    {
        $this->userId = $userId;
        $this->month = DateTimeService::normalizeMonth($month);
        $this->periodStart = DateTimeService::monthStart($this->month);
        $this->periodEnd = DateTimeService::monthEnd($this->month);
    }

    // ----------------------------------------------------------
    // PUBLIC API
    // ----------------------------------------------------------

    /**
     * Build and return the simplified balance sheet (totals only).
     *
     * @return array
     */
    public function getSimplified(): array
    {
        // totals
        $incomeTotal      = $this->getIncomeTotal();
        $spendingTotal    = $this->getSpendingTotal();
        $savingsSnapshot  = $this->getSavingsTotal();
        $debtPaidTotal    = $this->getDebtPaidTotalForPeriod();
        $recurringTotal   = $this->getRecurringTotal();

        // roll_over: income - spending - debt_paid - recurring - savings
        $outgoings = MoneyService::sum([$debtPaidTotal, $spendingTotal, $recurringTotal, $savingsSnapshot]);
        $rollover  = MoneyService::subtract($incomeTotal, $outgoings);

        return [
            'user_id'          => $this->userId,
            'month'            => $this->month->toDateString(),
            'total_income'     => round($incomeTotal, 2),
            'total_debt_paid'  => round($debtPaidTotal, 2),
            'total_spending'   => round($spendingTotal, 2),
            'total_recurring'  => round($recurringTotal, 2),
            'savings_snapshot' => round($savingsSnapshot, 2),
            'roll_over'        => round($rollover, 2),
        ];
    }

    /**
     * Build and return the expanded balance sheet for UI (nested details).
     *
     * @return array
     */
    public function getExpanded(): array
    {
        // Load data (cached)
        $incomeEntries = $this->getIncomeEntries();
        $purchases = $this->getPurchases();
        $debts = $this->getDebts();
        $savings = $this->getSavingsRows();

        // Income grouped by type
        $regularEntries = $incomeEntries->where('type', IncomeEntryType::Regular);
        $irregularTotal = (float) $incomeEntries->where('type', IncomeEntryType::Irregular)->sum('amount');
        $refundsTotal   = (float) $incomeEntries->where('type', IncomeEntryType::Refund)->sum('amount');

        $regularGrouped = $regularEntries
            ->groupBy(fn ($e) => $e->regular_schedule_id ?? 'manual')
            ->map(function ($group, $scheduleId) {
                $schedule = $group->first()->regularSchedule ?? null;
                $entries = $group->map(fn ($e) => [
                    'id'          => $e->id,
                    'name'        => $e->name,
                    'description' => $e->description,
                    'amount'      => (float) $e->amount,
                    'received_at' => DateTimeService::formatForUI($e->received_at, 'monthDayYear'),
                ])->values();

                return [
                    'regular_schedule_id' => $scheduleId === 'manual' ? null : (int) $scheduleId,
                    'name'                => $schedule?->name ?? ($group->first()->name ?? 'Regular income'),
                    'entries'             => $entries,
                    'total'               => MoneyService::sum($entries->pluck('amount')->toArray()),
                ];
            })->values();

        $regularTotal = MoneyService::sum($regularGrouped->pluck('total')->toArray());
        $incomeTotal  = MoneyService::sum([$regularTotal, $irregularTotal, $refundsTotal]);

        // Spending grouped by category
        $spendingByCategory = $purchases->groupBy(fn($p) => $p->category?->id ?? 0)
            ->map(function ($group, $categoryId) {
                $cat = $group->first()->category ?? null;
                $items = $group->map(fn($p) => [
                    'id' => $p->id,
                    'description' => $p->description,
                    'amount' => (float) $p->amount,
                    'date' => DateTimeService::formatForUI($p->date, 'short'),
                    'attachment_path' => $p->attachment_path,
                    'url' => $p->url,
                ])->values();

                $amount = MoneyService::sum($items->pluck('amount')->toArray());

                return [
                    'category_id' => $categoryId ?: null,
                    'category_name' => $cat?->name ?? 'Uncategorized',
                    'amount' => $amount,
                    'items' => $items,
                ];
            })->values();

        $spendingTotal = MoneyService::sum($spendingByCategory->pluck('amount')->toArray());

        // Debt details — one grouped payment sum for the period (no per-debt query).
        $paidByDebtId = $this->getDebtPaidByDebtForPeriod();
        $debtDetails = $debts->map(function ($d) use ($paidByDebtId) {
            $paidThisMonth = (float) ($paidByDebtId[$d->id] ?? 0.0);

            return [
                'id'                   => $d->id,
                'category_id'          => $d->category_id,
                'description'          => $d->description,
                'amount'               => (float) $d->amount,
                'remaining_balance'    => (float) $d->remaining_balance,
                'is_settled'           => $d->is_settled,
                'is_forgiven'          => $d->is_forgiven,
                'is_closed'            => $d->is_closed,
                'settle_date'          => $d->settle_date ? DateTimeService::formatForUI($d->settle_date, 'date') : null,
                'total_paid_in_period' => round($paidThisMonth, 2),
            ];
        });

        $debtDetails = $debtDetails->values();
        $debtTotalPaid = MoneyService::sum($debtDetails->pluck('total_paid_in_period')->toArray());
        $debtBalanceTotal = MoneyService::sum($debtDetails->pluck('remaining_balance')->toArray());

        // Savings
        $savingsRows = $savings->map(fn($s) => [
            'id'     => $s->id,
            'amount' => (float) $s->amount,
            'type'   => $s->type ?? 'deposit',
            'notes'  => $s->notes,
            'month'  => DateTimeService::formatForUI($s->month, 'monthDayYear'),
        ])->values();

        $savingsDeposits     = $savingsRows->where('type', 'deposit')->sum('amount');
        $savingsWithdrawals  = $savingsRows->where('type', 'withdrawal')->sum('amount');
        $savingsMonthlyTotal = (float) $savingsDeposits - (float) $savingsWithdrawals;

        $savingsGrandTotal = (float) Saving::forUser($this->userId)
            ->whereDate('month', '<=', $this->month->toDateString())
            ->selectRaw("SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END) as net")
            ->value('net') ?? 0.0;

        // Recurring: charged Facts + projected remaining (display only).
        // Closed months: no projections — rebuild from Facts / stamped names only.
        $monthLocked = MonthLockService::isLocked($this->userId, $this->month);
        $recurringCharged = $this->buildChargedRecurringGrouped();
        $recurringProjected = $monthLocked ? collect() : $this->buildProjectedRecurringGrouped();
        $recurringChargedTotal = MoneyService::sum($recurringCharged->pluck('total')->toArray());
        $recurringProjectedTotal = MoneyService::sum($recurringProjected->pluck('total')->toArray());

        // Rollover uses charged recurring only — projected never enters locked totals.
        $outgoings = MoneyService::sum([$debtTotalPaid, $spendingTotal, $recurringChargedTotal, $savingsMonthlyTotal]);
        $rollover  = MoneyService::subtract($incomeTotal, $outgoings);

        // Final structure
        return [
            'user_id' => $this->userId,
            'month' => DateTimeService::formatForUI($this->month, 'monthYear'),
            'is_locked' => $monthLocked,
            'income' => [
                'total'    => round($incomeTotal, 2),
                'by_type'  => [
                    'regular' => [
                        'total'     => round($regularTotal, 2),
                        'schedules' => $regularGrouped,
                    ],
                    'irregular' => [
                        'total' => round($irregularTotal, 2),
                    ],
                    'refund' => [
                        'total' => round($refundsTotal, 2),
                    ],
                ],
            ],
            'debt' => [
                'total'         => round($debtTotalPaid, 2),
                'balance_total' => round($debtBalanceTotal, 2),
                'debts'         => $debtDetails,
            ],
            'spending' => [
                'total'      => round($spendingTotal, 2),
                'categories' => $spendingByCategory,
            ],
            'recurring_payments' => [
                'total'           => round($recurringChargedTotal, 2),
                'charged_total'   => round($recurringChargedTotal, 2),
                'projected_total' => round($recurringProjectedTotal, 2),
                'streams'         => $recurringCharged,
                'projected'       => $recurringProjected,
            ],
            'savings' => [
                'monthly_total'    => round($savingsMonthlyTotal, 2),
                'monthly_deposits' => round((float) $savingsDeposits, 2),
                'monthly_withdrawals' => round((float) $savingsWithdrawals, 2),
                'grand_total'      => round($savingsGrandTotal, 2),
                'rows'             => $savingsRows,
            ],
            'roll_over' => [
                'total' => round($rollover, 2),
            ],
        ];
    }

    /**
     * Compare two months for the same user.
     *
     * @param string|Carbon $monthA
     * @param string|Carbon $monthB
     * @return array
     */
    public function compareMonths(string|Carbon $monthA, string|Carbon $monthB): array
    {
        $svcA = new self($this->userId, DateTimeService::normalizeMonth($monthA));
        $svcB = new self($this->userId, DateTimeService::normalizeMonth($monthB));

        $a = $svcA->getSimplified();
        $b = $svcB->getSimplified();

        $map = [
            'total_income'    => 'income',
            'total_debt_paid' => 'debt',
            'total_spending'  => 'spending',
            'total_recurring' => 'recurring',
            'savings_snapshot'=> 'savings',
            'roll_over'       => 'rollover',
        ];

        $out = [];
        foreach ($map as $k => $label) {
            $aval = (float) ($a[$k] ?? 0.0);
            $bval = (float) ($b[$k] ?? 0.0);
            $pct = MoneyService::deltaPercent($bval, $aval);
            $out[$label] = [
                'a' => round($aval, 2),
                'b' => round($bval, 2),
                'percent_change' => $pct,
            ];
        }

        return $out;
    }

    // ----------------------------------------------------------
    // INTERNAL: Totals & Data Loading
    // ----------------------------------------------------------

    /**
     * One-off purchases for the period.
     */
    protected function getPurchases(): Collection
    {
        if ($this->purchases !== null) {
            return $this->purchases;
        }

        $this->purchases = Purchase::forUser($this->userId)
            ->forPeriod($this->month, 'date', 'month')
            ->with('category')
            ->get();

        return $this->purchases;
    }

    /**
     * Materialized recurring charge Facts for the period.
     */
    protected function getRecurringCharges(): Collection
    {
        if ($this->recurringCharges !== null) {
            return $this->recurringCharges;
        }

        $this->recurringCharges = RecurringCharge::forUser($this->userId)
            ->forPeriod($this->month, 'occurred_on', 'month')
            ->with(['entry', 'stream', 'category'])
            ->get();

        return $this->recurringCharges;
    }

    /**
     * Load income entries for the period (cached).
     *
     * @return Collection
     */
    protected function getIncomeEntries(): Collection
    {
        if ($this->incomeEntries !== null) {
            return $this->incomeEntries;
        }

        $this->incomeEntries = IncomeEntry::forUser($this->userId)
            ->forPeriod($this->month, 'received_at', 'month')
            ->with('regularSchedule')
            ->get();

        return $this->incomeEntries;
    }

    /**
     * Load debts relevant to this period (cached).
     *
     * Criteria: debts issued on or before period end.
     *
     * @return Collection
     */
    protected function getDebts(): Collection
    {
        if ($this->debts !== null) {
            return $this->debts;
        }

        // Include debts issued on/before period end.
        // Exclude debts already closed (settled OR forgiven) before this period starts.
        // Closed months: include soft-archived instruments so history stays rebuildable from Facts.
        $query = MonthLockService::isLocked($this->userId, $this->month)
            ? Debt::withTrashed()
            : Debt::query();

        $this->debts = $query
            ->forUser($this->userId)
            ->whereDate('issue_date', '<=', $this->periodEnd->toDateString())
            ->where(function ($q) {
                $q->whereNull('settle_date')
                  ->orWhereDate('settle_date', '>=', $this->periodStart->toDateString());
            })
            ->with('payments')
            ->get();

        return $this->debts;
    }

    /**
     * Load savings rows for the period (cached).
     *
     * @return Collection
     */
    protected function getSavingsRows(): Collection
    {
        if ($this->savings !== null) {
            return $this->savings;
        }

        $this->savings = Saving::forUser($this->userId)
            ->forPeriod($this->month, 'month', 'month')
            ->get();

        return $this->savings;
    }

    /**
     * Load recurring payment entries that are active during this period (cached).
     *
     * @return Collection
     */
    protected function getRecurringEntries(): Collection
    {
        if ($this->recurringEntries !== null) {
            return $this->recurringEntries;
        }

        $this->recurringEntries = RecurringPaymentEntry::forUser($this->userId)
            ->activeForMonth($this->periodStart, $this->periodEnd)
            ->whereHas('stream', fn ($q) => $q->where('active', true))
            ->with(['stream', 'stream.category'])
            ->get();

        return $this->recurringEntries;
    }

    /**
     * Sum income for the period.
     *
     * @return float
     */
    protected function getIncomeTotal(): float
    {
        return (float) IncomeEntry::forUser($this->userId)
            ->forPeriod($this->month, 'received_at', 'month')
            ->sum('amount');
    }

    /**
     * Sum one-off spending for the period.
     */
    protected function getSpendingTotal(): float
    {
        return (float) Purchase::forUser($this->userId)
            ->forPeriod($this->month, 'date', 'month')
            ->sum('amount');
    }

    /**
     * Get net savings total for the month (deposits minus withdrawals).
     *
     * @return float
     */
    protected function getSavingsTotal(): float
    {
        $rows = $this->getSavingsRows();
        $deposits    = $rows->where('type', 'deposit')->sum('amount');
        $withdrawals = $rows->where('type', 'withdrawal')->sum('amount');

        return (float) $deposits - (float) $withdrawals;
    }

    /**
     * Charged recurring total for the period (materialized Facts only).
     * Used by simplified sheet + snapshots — never includes projections.
     */
    protected function getRecurringTotal(): float
    {
        return (float) $this->getRecurringCharges()->sum('amount');
    }

    /**
     * Group materialized recurring charge Facts by stream for the expanded sheet.
     * Uses stamped names on Facts so closed months stay stable after instrument rename.
     */
    protected function buildChargedRecurringGrouped(): Collection
    {
        return $this->getRecurringCharges()
            ->groupBy(fn (RecurringCharge $c) => $c->recurring_payment_stream_id)
            ->map(function (Collection $group, $streamId) {
                $first = $group->first();
                $entry = $first->entry;

                $items = $group->map(fn (RecurringCharge $c) => [
                    'id'               => $c->recurring_payment_entry_id,
                    'charge_id'        => $c->id,
                    'amount'           => (float) $c->amount,
                    'frequency'        => $entry?->frequency,
                    'day_of_month'     => $entry?->day_of_month,
                    'day_of_week'      => $entry?->day_of_week,
                    'occurrence_count' => 1,
                    'period_total'     => round((float) $c->amount, 2),
                    'charged_date'     => DateTimeService::formatForUI($c->occurred_on, 'short'),
                ])->values();

                return [
                    'stream_id'     => $streamId ?: null,
                    'stream_name'   => $first->stream_name,
                    'category_id'   => $first->recurring_payment_category_id,
                    'category_name' => $first->category_name ?? 'Uncategorized',
                    'total'         => MoneyService::sum($items->pluck('period_total')->toArray()),
                    'entries'       => $items,
                ];
            })
            ->filter(fn ($stream) => $stream['entries']->isNotEmpty())
            ->values();
    }

    /**
     * Remaining scheduled occurrences not yet materialized through period end (display only).
     */
    protected function buildProjectedRecurringGrouped(): Collection
    {
        $today = DateTimeService::today();
        $projectionStart = $today->copy()->addDay()->startOfDay();

        if ($projectionStart->gt($this->periodEnd)) {
            return collect();
        }

        if ($this->periodEnd->lt($today)) {
            return collect();
        }

        $from = $projectionStart->gt($this->periodStart) ? $projectionStart : $this->periodStart->copy();
        $calculator = $this->occurrenceCalculator();

        $chargedDatesByEntry = $this->getRecurringCharges()
            ->groupBy('recurring_payment_entry_id')
            ->map(fn (Collection $group) => $group
                ->map(fn (RecurringCharge $c) => $c->occurred_on->toDateString())
                ->all());

        return $this->getRecurringEntries()
            ->groupBy(fn ($e) => $e->recurring_payment_stream_id)
            ->map(function ($group, $streamId) use ($calculator, $from, $chargedDatesByEntry) {
                $stream = $group->first()->stream ?? null;
                $category = $stream?->category ?? null;

                $items = $group->map(function ($e) use ($calculator, $from, $chargedDatesByEntry) {
                    $dates = $calculator->recurringEntryDatesInPeriod($e, $from, $this->periodEnd);
                    $existing = $chargedDatesByEntry->get($e->id, []);
                    $dates = array_values(array_filter(
                        $dates,
                        fn (Carbon $d) => ! in_array($d->toDateString(), $existing, true)
                    ));
                    $periodTotal = MoneyService::sum(array_fill(0, count($dates), (float) $e->amount));

                    return [
                        'id'               => $e->id,
                        'amount'           => (float) $e->amount,
                        'frequency'        => $e->frequency,
                        'day_of_month'     => $e->day_of_month,
                        'day_of_week'      => $e->day_of_week,
                        'occurrence_count' => count($dates),
                        'period_total'     => round($periodTotal, 2),
                    ];
                })
                    ->filter(fn ($item) => $item['occurrence_count'] > 0)
                    ->values();

                return [
                    'stream_id'     => $streamId,
                    'stream_name'   => $stream?->name ?? 'Unknown',
                    'category_id'   => $category?->id,
                    'category_name' => $category?->name ?? 'Uncategorized',
                    'total'         => MoneyService::sum($items->pluck('period_total')->toArray()),
                    'entries'       => $items,
                ];
            })
            ->filter(fn ($stream) => $stream['entries']->isNotEmpty())
            ->values();
    }

    protected function occurrenceCalculator(): OccurrenceCalculatorService
    {
        return $this->occurrenceCalculator ??= app(OccurrenceCalculatorService::class);
    }

    // ----------------------------------------------------------
    // DEBT: Payment aggregation via debt_payments event table
    // ----------------------------------------------------------

    /**
     * Compute total debt paid during the current period for the user.
     * Uses the debt_payments event table for accurate per-month figures.
     *
     * @return float
     */
    protected function getDebtPaidTotalForPeriod(): float
    {
        return (float) DB::table('debt_payments')
            ->where('user_id', $this->userId)
            ->whereBetween('paid_at', [$this->periodStart->toDateTimeString(), $this->periodEnd->toDateTimeString()])
            ->sum('amount');
    }

    /**
     * Per-debt paid totals for the current period (single grouped query).
     *
     * @return array<int, float> debt_id => amount
     */
    protected function getDebtPaidByDebtForPeriod(): array
    {
        return DB::table('debt_payments')
            ->selectRaw('debt_id, SUM(amount) as total')
            ->where('user_id', $this->userId)
            ->whereBetween('paid_at', [$this->periodStart->toDateTimeString(), $this->periodEnd->toDateTimeString()])
            ->groupBy('debt_id')
            ->pluck('total', 'debt_id')
            ->map(fn ($total) => (float) $total)
            ->all();
    }

    // ----------------------------------------------------------
    // Persistence & History helpers
    // ----------------------------------------------------------

    /**
     * Persist simplified snapshot to balance_sheet_totals (update or create).
     *
     * @param array|null $simplified  // if null, will compute one
     * @return BalanceSheetTotal
     */
    public function persistSnapshot(array|null $simplified = null): BalanceSheetTotal
    {
        $data = $simplified ?? $this->getSimplified();

        $payload = [
            'total_income'     => $data['total_income'],
            'total_debt_paid'  => $data['total_debt_paid'],
            'total_spending'   => $data['total_spending'],
            'total_recurring'  => $data['total_recurring'],
            'savings_snapshot' => $data['savings_snapshot'],
            'roll_over'        => $data['roll_over'],
        ];

        return DB::transaction(function () use ($data, $payload) {
            $existing = BalanceSheetTotal::where('user_id', $data['user_id'])
                ->whereDate('month', $data['month'])
                ->lockForUpdate()
                ->first();

            if ($existing) {
                $existing->update($payload);
                return $existing->fresh();
            }

            return BalanceSheetTotal::create(array_merge(
                ['user_id' => $data['user_id'], 'month' => $data['month']],
                $payload
            ));
        });
    }

    /**
     * Get history (last N months) simplified snapshots for the user.
     *
     * @param int $months
     * @return Collection
     */
    public function getHistory(int $months = 12): Collection
    {
        return BalanceSheetTotal::forUser($this->userId)
            ->forLastPeriods($months, 'month', 'month')
            ->orderBy('month', 'asc')
            ->get();
    }
}