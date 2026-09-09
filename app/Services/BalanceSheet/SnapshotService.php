<?php

namespace App\Services\BalanceSheet;

use App\Models\BalanceSheetTotal;
use App\Services\BalanceSheetService;
use App\Services\DateTimeService;
use App\Services\MoneyService;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Simplified totals, persistence, history, and month comparison.
 */
final class SnapshotService
{
    public function __construct(
        private readonly PeriodContext $ctx,
        private readonly PeriodFactRepository $facts,
    ) {}

    public function simplified(): array
    {
        $incomeTotal = $this->facts->incomeTotal();
        $spendingTotal = $this->facts->spendingTotal();
        $savingsSnapshot = $this->facts->savingsTotal();
        $debtPaidTotal = $this->facts->debtPaidTotalForPeriod();
        $recurringTotal = $this->facts->recurringTotal();

        $outgoings = MoneyService::sum([$debtPaidTotal, $spendingTotal, $recurringTotal, $savingsSnapshot]);
        $rollover = MoneyService::subtract($incomeTotal, $outgoings);

        return [
            'user_id' => $this->ctx->userId,
            'month' => $this->ctx->month->toDateString(),
            'total_income_cents' => $incomeTotal,
            'total_debt_paid_cents' => $debtPaidTotal,
            'total_spending_cents' => $spendingTotal,
            'total_recurring_cents' => $recurringTotal,
            'savings_snapshot_cents' => $savingsSnapshot,
            'roll_over_cents' => $rollover,
        ];
    }

    public function persist(?array $simplified = null): BalanceSheetTotal
    {
        $data = $simplified ?? $this->simplified();

        $payload = [
            'total_income' => MoneyCents::toMajorString((int) $data['total_income_cents']),
            'total_debt_paid' => MoneyCents::toMajorString((int) $data['total_debt_paid_cents']),
            'total_spending' => MoneyCents::toMajorString((int) $data['total_spending_cents']),
            'total_recurring' => MoneyCents::toMajorString((int) $data['total_recurring_cents']),
            'savings_snapshot' => MoneyCents::toMajorString((int) $data['savings_snapshot_cents']),
            'roll_over' => MoneyCents::toMajorString((int) $data['roll_over_cents']),
        ];

        return DB::transaction(function () use ($data, $payload) {
            $existing = BalanceSheetTotal::where('user_id', $data['user_id'])
                ->whereDate('month', $data['month'])
                ->lockForUpdate()
                ->first();

            if ($existing) {
                $existing->update($payload);
                $snapshot = $existing->fresh();
            } else {
                $snapshot = BalanceSheetTotal::create(array_merge(
                    ['user_id' => $data['user_id'], 'month' => $data['month']],
                    $payload
                ));
            }

            app(\App\Services\BudgetService::class)->copyForwardAfterClose(
                (int) $data['user_id'],
                $this->ctx->month,
            );

            return $snapshot;
        });
    }

    public function history(int $months = 12): Collection
    {
        return BalanceSheetTotal::forUser($this->ctx->userId)
            ->forLastPeriods($months, 'month', 'month')
            ->orderBy('month', 'asc')
            ->get();
    }

    /**
     * Compare two months for the same user (builds a facade/SnapshotService per month).
     */
    public function compare(string|Carbon $monthA, string|Carbon $monthB): array
    {
        $svcA = new BalanceSheetService($this->ctx->userId, DateTimeService::normalizeMonth($monthA));
        $svcB = new BalanceSheetService($this->ctx->userId, DateTimeService::normalizeMonth($monthB));

        $a = $svcA->getSimplified();
        $b = $svcB->getSimplified();

        $map = [
            'total_income_cents' => 'income',
            'total_debt_paid_cents' => 'debt',
            'total_spending_cents' => 'spending',
            'total_recurring_cents' => 'recurring',
            'savings_snapshot_cents' => 'savings',
            'roll_over_cents' => 'rollover',
        ];

        $out = [];
        foreach ($map as $k => $label) {
            $aval = (int) ($a[$k] ?? 0);
            $bval = (int) ($b[$k] ?? 0);
            $pct = MoneyService::deltaPercent((float) $bval, (float) $aval);
            $out[$label] = [
                'a_cents' => $aval,
                'b_cents' => $bval,
                'percent_change' => $pct,
            ];
        }

        return $out;
    }
}
