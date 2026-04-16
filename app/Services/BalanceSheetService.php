<?php

namespace App\Services;

use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\IncomeEntry;
use App\Models\Purchase;
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
    public readonly Carbon $previousMonth;
    public readonly Carbon $previousPeriodStart;
    public readonly Carbon $previousPeriodEnd;

    /** Cached collections */
    protected ?Collection $purchases = null;
    protected ?Collection $incomeEntries = null;
    protected ?Collection $debts = null;
    protected ?Collection $savings = null;
    protected ?Collection $recurringEntries = null;

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

        $this->previousMonth = $this->month->copy()->subMonth();
        $this->previousPeriodStart = DateTimeService::monthStart($this->previousMonth);
        $this->previousPeriodEnd = DateTimeService::monthEnd($this->previousMonth);
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
        $incomeTotal = $this->getIncomeTotal();
        $spendingTotal = $this->getSpendingTotal();
        $savingsSnapshot = $this->getSavingsTotal();
        $debtPaidTotal = $this->getDebtPaidTotalForPeriod();

        // roll_over definition: income - (debt paid + spending)
        $rollover = MoneyService::subtract($incomeTotal, MoneyService::add($debtPaidTotal, $spendingTotal));

        return [
            'user_id' => $this->userId,
            'month' => $this->month->toDateString(), // YYYY-MM-DD (first of month)
            'total_income' => round($incomeTotal, 2),
            'total_debt_paid' => round($debtPaidTotal, 2),
            'total_spending' => round($spendingTotal, 2),
            'savings_snapshot' => round($savingsSnapshot, 2),
            'roll_over' => round($rollover, 2),
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

        // Income grouped by stream
        $incomeGrouped = $incomeEntries->groupBy('income_stream_id')->map(function ($group, $streamId) {
            $stream = $group->first()->stream ?? null;
            $entries = $group->map(fn($e) => [
                'id' => $e->id,
                'income_stream_id' => $e->income_stream_id,
                'amount' => (float) $e->amount,
                'month' => DateTimeService::formatForUI($e->month, 'monthDayYear'),
            ])->values();

            $total = MoneyService::sum($entries->pluck('amount')->toArray());

            return [
                'income_stream_id' => $streamId,
                'name' => $stream?->name ?? 'Unknown',
                'entries' => $entries,
                'total' => $total,
            ];
        })->values();

        $incomeTotal = MoneyService::sum($incomeGrouped->pluck('total')->toArray());

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
                    'category_name' => $cat?->category_name ?? 'Uncategorized',
                    'amount' => $amount,
                    'items' => $items,
                ];
            })->values();

        $spendingTotal = MoneyService::sum($spendingByCategory->pluck('amount')->toArray());

        // Debt details (per-debt paid this month computed from debt_payments)
        $debtDetails = $debts->map(function ($d) {
            $paidThisMonth = $this->getDebtPaidForDebtInPeriod($d, $this->periodStart, $this->periodEnd);

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
            'id' => $s->id,
            'amount' => (float) $s->amount,
            'month' => DateTimeService::formatForUI($s->month, 'monthDayYear'),
        ])->values();

        $savingsMonthlyTotal = MoneyService::sum($savingsRows->pluck('amount')->toArray());
        $savingsGrandTotal = (float) Saving::where('user_id', $this->userId)
            ->whereDate('month', '<=', $this->month->toDateString())
            ->sum('amount');

        // Recurring payment entries active this month
        $recurringEntries   = $this->getRecurringEntries();
        $recurringGrouped   = $recurringEntries->groupBy(fn ($e) => $e->recurring_payment_stream_id)
            ->map(function ($group, $streamId) {
                $stream   = $group->first()->stream ?? null;
                $category = $stream?->category ?? null;
                $items    = $group->map(fn ($e) => [
                    'id'           => $e->id,
                    'amount'       => (float) $e->amount,
                    'frequency'    => $e->frequency,
                    'day_of_month' => $e->day_of_month,
                    'day_of_week'  => $e->day_of_week,
                    'start_date'   => $e->start_date?->toDateString(),
                    'end_date'     => $e->end_date?->toDateString(),
                ])->values();

                return [
                    'stream_id'     => $streamId,
                    'stream_name'   => $stream?->name ?? 'Unknown',
                    'category_id'   => $category?->id,
                    'category_name' => $category?->name ?? 'Uncategorized',
                    'entries'       => $items,
                ];
            })->values();

        // Rollover
        $rollover = MoneyService::subtract($incomeTotal, MoneyService::add($debtTotalPaid, $spendingTotal));

        // Final structure
        return [
            'user_id' => $this->userId,
            'month' => DateTimeService::formatForUI($this->month, 'monthYear'),
            'income' => [
                'total'          => round($incomeTotal, 2),
                'income_entries' => $incomeGrouped,
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
                'streams' => $recurringGrouped,
            ],
            'savings' => [
                'monthly_total' => round($savingsMonthlyTotal, 2),
                'grand_total'   => round($savingsGrandTotal, 2),
                'rows'          => $savingsRows,
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
            'total_income' => 'income',
            'total_debt_paid' => 'debt',
            'total_spending' => 'spending',
            'savings_snapshot' => 'savings',
            'roll_over' => 'rollover',
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
     * Load purchases for the period (cached).
     *
     * @return Collection
     */
    protected function getPurchases(): Collection
    {
        if ($this->purchases !== null) {
            return $this->purchases;
        }

        $this->purchases = Purchase::where('user_id', $this->userId)
            ->forPeriod($this->month, 'date', 'month')
            ->with('category')
            ->get();

        return $this->purchases;
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

        $this->incomeEntries = IncomeEntry::where('user_id', $this->userId)
            ->forPeriod($this->month, 'month', 'month')
            ->with('stream')
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
        $this->debts = Debt::where('user_id', $this->userId)
            ->whereDate('issue_date', '<=', $this->periodEnd->toDateString())
            ->where(function ($q) {
                $q->whereNull('settle_date')
                  ->orWhereDate('settle_date', '>=', $this->periodStart->toDateString());
            })
            // Eager-load payments so getRemainingBalanceAttribute() avoids N+1 queries.
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

        $this->savings = Saving::where('user_id', $this->userId)
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

        $this->recurringEntries = RecurringPaymentEntry::where('user_id', $this->userId)
            ->activeForMonth($this->periodStart, $this->periodEnd)
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
        return (float) IncomeEntry::where('user_id', $this->userId)
            ->forPeriod($this->month, 'month', 'month')
            ->sum('amount');
    }

    /**
     * Sum spending (purchases) for the period.
     *
     * @return float
     */
    protected function getSpendingTotal(): float
    {
        return (float) Purchase::where('user_id', $this->userId)
            ->forPeriod($this->month, 'date', 'month')
            ->sum('amount');
    }

    /**
     * Get savings total for the month (snapshot).
     *
     * @return float
     */
    protected function getSavingsTotal(): float
    {
        return (float) Saving::where('user_id', $this->userId)
            ->forPeriod($this->month, 'month', 'month')
            ->sum('amount');
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
     * Compute amount paid for a single debt during the given period.
     * Queries debt_payments directly for accurate per-debt, per-period figures.
     *
     * @param Debt   $debt
     * @param Carbon $periodStart
     * @param Carbon $periodEnd
     * @return float
     */
    protected function getDebtPaidForDebtInPeriod(Debt $debt, Carbon $periodStart, Carbon $periodEnd): float
    {
        return (float) DB::table('debt_payments')
            ->where('debt_id', $debt->id)
            ->whereBetween('paid_at', [$periodStart->toDateTimeString(), $periodEnd->toDateTimeString()])
            ->sum('amount');
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
            'total_income'    => $data['total_income'],
            'total_debt_paid' => $data['total_debt_paid'],
            'total_spending'  => $data['total_spending'],
            'savings_snapshot'=> $data['savings_snapshot'],
            'roll_over'       => $data['roll_over'],
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
        return BalanceSheetTotal::where('user_id', $this->userId)
            ->forLastPeriods($months, 'month', 'month')
            ->orderBy('month', 'asc')
            ->get();
    }
}