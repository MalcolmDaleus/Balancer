<?php

namespace App\Services\BalanceSheet;

use App\Models\Debt;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\RecurringPaymentEntry;
use App\Models\Saving;
use App\Support\MoneyCents;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cached Fact loaders and period totals for one balance-sheet period.
 */
final class PeriodFactRepository
{
    protected ?Collection $purchases = null;

    protected ?Collection $recurringCharges = null;

    protected ?Collection $incomeEntries = null;

    protected ?Collection $debts = null;

    protected ?Collection $savings = null;

    protected ?Collection $recurringEntries = null;

    public function __construct(
        private readonly PeriodContext $ctx,
    ) {}

    public function purchases(): Collection
    {
        if ($this->purchases !== null) {
            return $this->purchases;
        }

        $this->purchases = Purchase::forUser($this->ctx->userId)
            ->forPeriod($this->ctx->month, 'date', 'month')
            ->with('category')
            ->get();

        return $this->purchases;
    }

    public function recurringCharges(): Collection
    {
        if ($this->recurringCharges !== null) {
            return $this->recurringCharges;
        }

        $this->recurringCharges = RecurringCharge::forUser($this->ctx->userId)
            ->forPeriod($this->ctx->month, 'occurred_on', 'month')
            ->with(['entry', 'stream', 'category'])
            ->get();

        return $this->recurringCharges;
    }

    public function incomeEntries(): Collection
    {
        if ($this->incomeEntries !== null) {
            return $this->incomeEntries;
        }

        $this->incomeEntries = IncomeEntry::forUser($this->ctx->userId)
            ->forPeriod($this->ctx->month, 'received_at', 'month')
            ->with('regularSchedule')
            ->get();

        return $this->incomeEntries;
    }

    /**
     * Debts issued on/before period end, still open during the period.
     * Closed months include soft-archived instruments for rebuildable history.
     */
    public function debts(): Collection
    {
        if ($this->debts !== null) {
            return $this->debts;
        }

        $query = $this->ctx->isLocked()
            ? Debt::withTrashed()
            : Debt::query();

        $this->debts = $query
            ->forUser($this->ctx->userId)
            ->whereDate('issue_date', '<=', $this->ctx->periodEnd->toDateString())
            ->where(function ($q) {
                $q->whereNull('settle_date')
                    ->orWhereDate('settle_date', '>=', $this->ctx->periodStart->toDateString());
            })
            ->with('payments')
            ->get();

        return $this->debts;
    }

    public function savingsRows(): Collection
    {
        if ($this->savings !== null) {
            return $this->savings;
        }

        $this->savings = Saving::forUser($this->ctx->userId)
            ->forPeriod($this->ctx->month, 'month', 'month')
            ->get();

        return $this->savings;
    }

    public function recurringEntries(): Collection
    {
        if ($this->recurringEntries !== null) {
            return $this->recurringEntries;
        }

        $this->recurringEntries = RecurringPaymentEntry::forUser($this->ctx->userId)
            ->activeForMonth($this->ctx->periodStart, $this->ctx->periodEnd)
            ->whereHas('stream', fn ($q) => $q->where('active', true))
            ->with(['stream', 'stream.category'])
            ->get();

        return $this->recurringEntries;
    }

    /** Sum income from cached incomeEntries, in cents. */
    public function incomeTotal(): int
    {
        return MoneyCents::sumMajors($this->incomeEntries()->pluck('amount'));
    }

    /** Sum one-off spending from cached purchases, in cents. */
    public function spendingTotal(): int
    {
        return MoneyCents::sumMajors($this->purchases()->pluck('amount'));
    }

    /** Net savings for the month (deposits − withdrawals), in cents. */
    public function savingsTotal(): int
    {
        $rows = $this->savingsRows();
        $deposits = MoneyCents::sumMajors($rows->where('type', 'deposit')->pluck('amount'));
        $withdrawals = MoneyCents::sumMajors($rows->where('type', 'withdrawal')->pluck('amount'));

        return $deposits - $withdrawals;
    }

    /** Running savings balance through this month (inclusive), in cents. */
    public function savingsGrandTotal(): int
    {
        return Saving::runningBalance(
            $this->ctx->userId,
            $this->ctx->month->toDateString(),
        );
    }

    /** Charged recurring total in cents (Facts only — never projections). */
    public function recurringTotal(): int
    {
        return MoneyCents::sumMajors($this->recurringCharges()->pluck('amount'));
    }

    public function debtPaidTotalForPeriod(): int
    {
        return MoneyCents::fromMajor(DB::table('debt_payments')
            ->where('user_id', $this->ctx->userId)
            ->whereBetween('paid_at', [
                $this->ctx->periodStart->toDateTimeString(),
                $this->ctx->periodEnd->toDateTimeString(),
            ])
            ->sum('amount'));
    }

    /**
     * Per-debt paid totals for the period (single grouped query).
     *
     * @return array<int, int> debt_id => cents
     */
    public function debtPaidByDebtForPeriod(): array
    {
        return DB::table('debt_payments')
            ->selectRaw('debt_id, SUM(amount) as total')
            ->where('user_id', $this->ctx->userId)
            ->whereBetween('paid_at', [
                $this->ctx->periodStart->toDateTimeString(),
                $this->ctx->periodEnd->toDateTimeString(),
            ])
            ->groupBy('debt_id')
            ->pluck('total', 'debt_id')
            ->map(fn ($total) => MoneyCents::fromMajor($total))
            ->all();
    }
}
