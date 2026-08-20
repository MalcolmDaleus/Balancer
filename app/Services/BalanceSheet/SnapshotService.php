<?php

namespace App\Services\BalanceSheet;

use App\Models\BalanceSheetTotal;
use App\Services\BalanceSheetService;
use App\Services\DateTimeService;
use App\Services\MoneyService;
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
            'user_id'          => $this->ctx->userId,
            'month'            => $this->ctx->month->toDateString(),
            'total_income'     => round($incomeTotal, 2),
            'total_debt_paid'  => round($debtPaidTotal, 2),
            'total_spending'   => round($spendingTotal, 2),
            'total_recurring'  => round($recurringTotal, 2),
            'savings_snapshot' => round($savingsSnapshot, 2),
            'roll_over'        => round($rollover, 2),
        ];
    }

    public function persist(?array $simplified = null): BalanceSheetTotal
    {
        $data = $simplified ?? $this->simplified();

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
            'total_income'     => 'income',
            'total_debt_paid'  => 'debt',
            'total_spending'   => 'spending',
            'total_recurring'  => 'recurring',
            'savings_snapshot' => 'savings',
            'roll_over'        => 'rollover',
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
}
