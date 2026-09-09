<?php

namespace App\Services\BalanceSheet;

use App\Enums\IncomeEntryType;
use App\Services\DateTimeService;
use App\Services\LiquidityService;
use App\Services\MoneyService;
use App\Support\MoneyCents;

/**
 * Formats the expanded (UI) balance sheet payload for one period.
 * Money fields are integer cents.
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
        $irregularTotal = MoneyCents::sumMajors($incomeEntries->where('type', IncomeEntryType::Irregular)->pluck('amount'));
        $refundsTotal = MoneyCents::sumMajors($incomeEntries->where('type', IncomeEntryType::Refund)->pluck('amount'));

        $regularGrouped = $regularEntries
            ->groupBy(fn ($e) => $e->regular_schedule_id ?? 'manual')
            ->map(function ($group, $scheduleId) {
                $schedule = $group->first()->regularSchedule ?? null;
                $entries = $group->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->name,
                    'description' => $e->description,
                    'amount_cents' => MoneyCents::fromMajor($e->amount),
                    'received_at' => DateTimeService::formatForUI($e->received_at, 'monthDayYear'),
                ])->values();

                return [
                    'regular_schedule_id' => $scheduleId === 'manual' ? null : (int) $scheduleId,
                    'name' => $schedule?->name ?? ($group->first()->name ?? 'Regular income'),
                    'entries' => $entries,
                    'total_cents' => MoneyService::sum($entries->pluck('amount_cents')->toArray()),
                ];
            })->values();

        $regularTotal = MoneyService::sum($regularGrouped->pluck('total_cents')->toArray());
        $incomeTotal = MoneyService::sum([$regularTotal, $irregularTotal, $refundsTotal]);

        $spendingByCategory = $purchases->groupBy(fn ($p) => $p->category?->id ?? 0)
            ->map(function ($group, $categoryId) {
                $cat = $group->first()->category ?? null;
                $items = $group->map(fn ($p) => [
                    'id' => $p->id,
                    'description' => $p->description,
                    'amount_cents' => MoneyCents::fromMajor($p->amount),
                    'date' => DateTimeService::formatForUI($p->date, 'short'),
                    'attachment_path' => $p->attachment_path,
                    'url' => $p->url,
                ])->values();

                $amount = MoneyService::sum($items->pluck('amount_cents')->toArray());

                return [
                    'category_id' => $categoryId ?: null,
                    'category_name' => $cat?->name ?? 'Uncategorized',
                    'amount_cents' => $amount,
                    'items' => $items,
                ];
            })->values();

        $spendingTotal = MoneyService::sum($spendingByCategory->pluck('amount_cents')->toArray());

        $paidByDebtId = $this->facts->debtPaidByDebtForPeriod();
        $debtDetails = $debts->map(function ($d) use ($paidByDebtId) {
            $paidThisMonth = (int) ($paidByDebtId[$d->id] ?? 0);

            return [
                'id' => $d->id,
                'category_id' => $d->category_id,
                'description' => $d->description,
                'amount_cents' => MoneyCents::fromMajor($d->amount),
                'remaining_cents' => $d->remaining_cents,
                'is_settled' => $d->is_settled,
                'is_forgiven' => $d->is_forgiven,
                'is_closed' => $d->is_closed,
                'settle_date' => $d->settle_date ? DateTimeService::formatForUI($d->settle_date, 'date') : null,
                'total_paid_in_period_cents' => $paidThisMonth,
            ];
        })->values();

        $debtTotalPaid = MoneyService::sum($debtDetails->pluck('total_paid_in_period_cents')->toArray());
        $debtBalanceTotal = MoneyService::sum($debtDetails->pluck('remaining_cents')->toArray());

        $savingsRows = $savings->map(fn ($s) => [
            'id' => $s->id,
            'amount_cents' => MoneyCents::fromMajor($s->amount),
            'type' => $s->type ?? 'deposit',
            'notes' => $s->notes,
            'month' => DateTimeService::formatForUI($s->month, 'monthDayYear'),
        ])->values();

        $savingsDeposits = MoneyService::sum($savingsRows->where('type', 'deposit')->pluck('amount_cents')->toArray());
        $savingsWithdrawals = MoneyService::sum($savingsRows->where('type', 'withdrawal')->pluck('amount_cents')->toArray());
        $savingsMonthlyTotal = $savingsDeposits - $savingsWithdrawals;
        $savingsGrandTotal = $this->facts->savingsGrandTotal();

        $monthLocked = $this->ctx->isLocked();
        $recurringCharged = $this->recurring->chargedGrouped();
        $recurringProjected = $monthLocked ? collect() : $this->recurring->projectedGrouped();
        $recurringChargedTotal = MoneyService::sum($recurringCharged->pluck('total_cents')->toArray());
        $recurringProjectedTotal = MoneyService::sum($recurringProjected->pluck('total_cents')->toArray());

        $outgoings = MoneyService::sum([$debtTotalPaid, $spendingTotal, $recurringChargedTotal, $savingsMonthlyTotal]);
        $rollover = MoneyService::subtract($incomeTotal, $outgoings);

        return [
            'user_id' => $this->ctx->userId,
            'month' => DateTimeService::formatForUI($this->ctx->month, 'monthYear'),
            'is_locked' => $monthLocked,
            'income' => [
                'total_cents' => $incomeTotal,
                'by_type' => [
                    'regular' => [
                        'total_cents' => $regularTotal,
                        'schedules' => $regularGrouped,
                    ],
                    'irregular' => [
                        'total_cents' => $irregularTotal,
                    ],
                    'refund' => [
                        'total_cents' => $refundsTotal,
                    ],
                ],
            ],
            'debt' => [
                'total_cents' => $debtTotalPaid,
                'balance_total_cents' => $debtBalanceTotal,
                'debts' => $debtDetails,
            ],
            'spending' => [
                'total_cents' => $spendingTotal,
                'categories' => $spendingByCategory,
            ],
            'recurring_payments' => [
                'total_cents' => $recurringChargedTotal,
                'charged_total_cents' => $recurringChargedTotal,
                'projected_total_cents' => $recurringProjectedTotal,
                'streams' => $recurringCharged,
                'projected' => $recurringProjected,
            ],
            'savings' => [
                'monthly_total_cents' => $savingsMonthlyTotal,
                'monthly_deposits_cents' => $savingsDeposits,
                'monthly_withdrawals_cents' => $savingsWithdrawals,
                'grand_total_cents' => $savingsGrandTotal,
                'rows' => $savingsRows,
            ],
            'roll_over' => [
                'total_cents' => $rollover,
            ],
            'wallet' => app(LiquidityService::class)->forUser($this->ctx->userId),
        ];
    }
}
