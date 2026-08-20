<?php

namespace App\Services\BalanceSheet;

use App\Enums\IncomeEntryType;
use App\Services\DateTimeService;
use App\Services\MoneyService;

/**
 * Formats the expanded (UI) balance sheet payload for one period.
 */
final class ExpandedPresenter
{
    public function __construct(
        private readonly PeriodContext $ctx,
        private readonly PeriodFactRepository $facts,
        private readonly RecurringSection $recurring,
    ) {}

    public function present(): array
    {
        $incomeEntries = $this->facts->incomeEntries();
        $purchases = $this->facts->purchases();
        $debts = $this->facts->debts();
        $savings = $this->facts->savingsRows();

        $regularEntries = $incomeEntries->where('type', IncomeEntryType::Regular);
        $irregularTotal = (float) $incomeEntries->where('type', IncomeEntryType::Irregular)->sum('amount');
        $refundsTotal = (float) $incomeEntries->where('type', IncomeEntryType::Refund)->sum('amount');

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
        $incomeTotal = MoneyService::sum([$regularTotal, $irregularTotal, $refundsTotal]);

        $spendingByCategory = $purchases->groupBy(fn ($p) => $p->category?->id ?? 0)
            ->map(function ($group, $categoryId) {
                $cat = $group->first()->category ?? null;
                $items = $group->map(fn ($p) => [
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

        $paidByDebtId = $this->facts->debtPaidByDebtForPeriod();
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
        })->values();

        $debtTotalPaid = MoneyService::sum($debtDetails->pluck('total_paid_in_period')->toArray());
        $debtBalanceTotal = MoneyService::sum($debtDetails->pluck('remaining_balance')->toArray());

        $savingsRows = $savings->map(fn ($s) => [
            'id'     => $s->id,
            'amount' => (float) $s->amount,
            'type'   => $s->type ?? 'deposit',
            'notes'  => $s->notes,
            'month'  => DateTimeService::formatForUI($s->month, 'monthDayYear'),
        ])->values();

        $savingsDeposits = $savingsRows->where('type', 'deposit')->sum('amount');
        $savingsWithdrawals = $savingsRows->where('type', 'withdrawal')->sum('amount');
        $savingsMonthlyTotal = (float) $savingsDeposits - (float) $savingsWithdrawals;
        $savingsGrandTotal = $this->facts->savingsGrandTotal();

        $monthLocked = $this->ctx->isLocked();
        $recurringCharged = $this->recurring->chargedGrouped();
        $recurringProjected = $monthLocked ? collect() : $this->recurring->projectedGrouped();
        $recurringChargedTotal = MoneyService::sum($recurringCharged->pluck('total')->toArray());
        $recurringProjectedTotal = MoneyService::sum($recurringProjected->pluck('total')->toArray());

        $outgoings = MoneyService::sum([$debtTotalPaid, $spendingTotal, $recurringChargedTotal, $savingsMonthlyTotal]);
        $rollover = MoneyService::subtract($incomeTotal, $outgoings);

        return [
            'user_id' => $this->ctx->userId,
            'month' => DateTimeService::formatForUI($this->ctx->month, 'monthYear'),
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
}
