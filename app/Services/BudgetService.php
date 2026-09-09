<?php

namespace App\Services;

use App\Enums\BudgetEnvelopeDomain;
use App\Exceptions\DomainException;
use App\Models\BudgetEnvelope;
use App\Models\BudgetPlan;
use App\Models\Debt;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringPaymentCategory;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BudgetService
{
    public function show(int $userId, Carbon|string|null $month = null): array
    {
        $month = DateTimeService::normalizeMonth($month);
        $plan = $this->planFor($userId, $month);
        $actuals = $this->purchaseActuals($userId, $month);
        $expanded = (new BalanceSheetService($userId, $month))->getExpanded();
        $bills = $this->billsBlock($expanded, $plan);
        $debts = $this->debtsBlock($userId, $expanded, $plan);

        $hasPlan = $plan !== null;
        $discretionaryPlan = $hasPlan ? (int) $plan->discretionary_cents : 0;
        $discretionaryActual = $actuals['total_cents'];
        $categoryRows = $this->categoryRows($userId, $plan, $actuals['by_category']);
        $cappedActual = 0;
        foreach ($categoryRows as $row) {
            if ($row['has_cap']) {
                $cappedActual += $row['actual_cents'];
            }
        }
        $envelopeCapSum = 0;
        foreach ($categoryRows as $row) {
            if ($row['has_cap']) {
                $envelopeCapSum += $row['plan_cents'];
            }
        }
        $unallocatedPlan = $hasPlan ? max(0, $discretionaryPlan - $envelopeCapSum) : 0;
        $unallocatedActual = max(0, $discretionaryActual - $cappedActual);
        $cappedRows = array_values(array_filter($categoryRows, fn (array $row) => $row['has_cap']));

        $savePlan = $hasPlan ? $plan->save_cents : null;
        $saveActual = (int) ($expanded['savings']['monthly_total_cents'] ?? 0);

        $locked = MonthLockService::isLocked($userId, $month);
        $today = DateTimeService::today();
        $periodEnd = $month->copy()->endOfMonth();
        $daysLeft = $locked || $today->gt($periodEnd)
            ? 0
            : (int) $today->diffInDays($periodEnd);

        return [
            'month' => $month->format('Y-m'),
            'is_locked' => $locked,
            'has_plan' => $hasPlan,
            'days_left' => $daysLeft,
            'discretionary' => [
                'plan_cents' => $discretionaryPlan,
                'actual_cents' => $discretionaryActual,
                'left_cents' => $discretionaryPlan - $discretionaryActual,
            ],
            'categories' => $cappedRows,
            'unallocated' => $hasPlan && ($unallocatedPlan > 0 || $envelopeCapSum > 0) ? [
                'plan_cents' => $unallocatedPlan,
                'actual_cents' => $unallocatedActual,
                'left_cents' => $unallocatedPlan - $unallocatedActual,
            ] : null,
            'bills' => $bills,
            'debts' => $debts,
            'save' => $savePlan === null ? null : [
                'plan_cents' => (int) $savePlan,
                'actual_cents' => $saveActual,
                'left_cents' => (int) $savePlan - $saveActual,
            ],
            'purchase_categories' => PurchaseCategory::forUser($userId)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (PurchaseCategory $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'actual_cents' => $actuals['by_category'][$c->id]['cents'] ?? 0,
                ])
                ->values()
                ->all(),
            'savings_this_month_cents' => $saveActual,
        ];
    }

    /**
     * @param  array{
     *   discretionary_cents: int,
     *   bills_cents?: int|null,
     *   debt_payment_cents?: int|null,
     *   save_cents?: int|null,
     *   envelopes?: list<array{domain: string, category_id: int, amount_cents: int}>
     * }  $payload
     */
    public function upsert(int $userId, Carbon|string $month, array $payload): array
    {
        $month = DateTimeService::normalizeMonth($month);
        MonthLockService::assertUnlocked($userId, $month);

        $replaceEnvelopes = array_key_exists('envelopes', $payload);
        $envelopes = $replaceEnvelopes ? ($payload['envelopes'] ?? []) : [];
        $existing = $this->planFor($userId, $month);
        $toValidate = $replaceEnvelopes
            ? $envelopes
            : ($existing?->envelopes->map(fn (BudgetEnvelope $e) => [
                'domain' => $e->domain instanceof BudgetEnvelopeDomain ? $e->domain->value : (string) $e->domain,
                'category_id' => (int) $e->category_id,
                'amount_cents' => (int) $e->amount_cents,
            ])->all() ?? []);
        $this->assertEnvelopesValid($userId, (int) $payload['discretionary_cents'], $toValidate);

        DB::transaction(function () use ($userId, $month, $payload, $replaceEnvelopes, $envelopes) {
            $plan = BudgetPlan::query()
                ->where('user_id', $userId)
                ->whereDate('month', $month->toDateString())
                ->lockForUpdate()
                ->first();

            $attrs = [
                'discretionary_cents' => (int) $payload['discretionary_cents'],
                'bills_cents' => array_key_exists('bills_cents', $payload) ? $payload['bills_cents'] : ($plan?->bills_cents),
                'debt_payment_cents' => array_key_exists('debt_payment_cents', $payload)
                    ? $payload['debt_payment_cents']
                    : ($plan?->debt_payment_cents),
                'save_cents' => array_key_exists('save_cents', $payload) ? $payload['save_cents'] : ($plan?->save_cents),
            ];

            if ($plan) {
                $plan->update($attrs);
            } else {
                $plan = BudgetPlan::create(array_merge($attrs, [
                    'user_id' => $userId,
                    'month' => $month->toDateString(),
                ]));
            }

            if ($replaceEnvelopes) {
                $plan->envelopes()->delete();

                foreach ($envelopes as $row) {
                    BudgetEnvelope::create([
                        'user_id' => $userId,
                        'budget_plan_id' => $plan->id,
                        'domain' => $row['domain'],
                        'category_id' => $row['category_id'],
                        'amount_cents' => $row['amount_cents'],
                    ]);
                }
            }
        });

        return $this->show($userId, $month);
    }

    public function destroy(int $userId, Carbon|string $month): void
    {
        $month = DateTimeService::normalizeMonth($month);
        MonthLockService::assertUnlocked($userId, $month);

        BudgetPlan::query()
            ->where('user_id', $userId)
            ->whereDate('month', $month->toDateString())
            ->delete();
    }

    public function copyForwardAfterClose(int $userId, Carbon|string $closedMonth): void
    {
        $closed = DateTimeService::normalizeMonth($closedMonth);
        $next = $closed->copy()->addMonth()->startOfMonth();
        $source = $this->planFor($userId, $closed);
        if ($source === null) {
            return;
        }

        if ($this->planFor($userId, $next) !== null) {
            return;
        }

        DB::transaction(function () use ($userId, $closed, $next, $source) {
            $copy = BudgetPlan::create([
                'user_id' => $userId,
                'month' => $next->toDateString(),
                'discretionary_cents' => (int) $source->discretionary_cents,
                'bills_cents' => $source->bills_cents,
                'debt_payment_cents' => $source->debt_payment_cents,
                'save_cents' => $source->save_cents,
                'copied_from_month' => $closed->toDateString(),
            ]);

            foreach ($source->envelopes as $envelope) {
                BudgetEnvelope::create([
                    'user_id' => $userId,
                    'budget_plan_id' => $copy->id,
                    'domain' => $envelope->domain,
                    'category_id' => $envelope->category_id,
                    'amount_cents' => (int) $envelope->amount_cents,
                ]);
            }
        });
    }

    public function planFor(int $userId, Carbon $month): ?BudgetPlan
    {
        return BudgetPlan::query()
            ->where('user_id', $userId)
            ->whereDate('month', $month->toDateString())
            ->with('envelopes')
            ->first();
    }

    /**
     * @return array{total_cents: int, by_category: array<int, array{name: string, cents: int}>}
     */
    public function purchaseActuals(int $userId, Carbon $month): array
    {
        $from = $month->copy()->startOfMonth();
        $to = $month->copy()->endOfMonth();

        $purchases = Purchase::query()
            ->where('user_id', $userId)
            ->with(['category', 'refundIncomeEntries'])
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->get();

        $byCategory = [];
        $total = 0;

        foreach ($purchases as $purchase) {
            $refunded = MoneyCents::fromMajor($purchase->refundIncomeEntries->sum('amount'));
            $net = MoneyCents::fromMajor($purchase->amount) - $refunded;
            $total += $net;
            $id = (int) $purchase->category_id;
            if (! isset($byCategory[$id])) {
                $byCategory[$id] = [
                    'name' => $purchase->category?->name ?? 'Uncategorized',
                    'cents' => 0,
                ];
            }
            $byCategory[$id]['cents'] += $net;
        }

        return ['total_cents' => $total, 'by_category' => $byCategory];
    }

    /**
     * @param  list<array{domain: string, category_id: int, amount_cents: int}>  $envelopes
     */
    private function assertEnvelopesValid(int $userId, int $discretionaryCents, array $envelopes): void
    {
        $purchaseCap = 0;

        foreach ($envelopes as $row) {
            $domain = BudgetEnvelopeDomain::from($row['domain']);
            $categoryId = (int) $row['category_id'];

            $exists = match ($domain) {
                BudgetEnvelopeDomain::Purchase => PurchaseCategory::forUser($userId)->whereKey($categoryId)->exists(),
                BudgetEnvelopeDomain::Recurring => RecurringPaymentCategory::forUser($userId)->whereKey($categoryId)->exists(),
            };

            if (! $exists) {
                throw new DomainException('invalid_category', 'Category does not belong to this account.');
            }

            if ($domain === BudgetEnvelopeDomain::Purchase) {
                $purchaseCap += (int) $row['amount_cents'];
            }
        }

        if ($purchaseCap > $discretionaryCents) {
            throw new DomainException('envelope_overflow', 'Category caps cannot exceed the global spending plan.');
        }
    }

    /**
     * @param  array<int, array{name: string, cents: int}>  $actuals
     * @return list<array{category_id: int, name: string, plan_cents: int, actual_cents: int, left_cents: int, has_cap: bool}>
     */
    private function categoryRows(int $userId, ?BudgetPlan $plan, array $actuals): array
    {
        $caps = [];
        if ($plan) {
            foreach ($plan->envelopes as $envelope) {
                if ($envelope->domain !== BudgetEnvelopeDomain::Purchase) {
                    continue;
                }
                $caps[(int) $envelope->category_id] = (int) $envelope->amount_cents;
            }
        }

        $ids = array_unique([...array_keys($caps), ...array_keys($actuals)]);
        $names = PurchaseCategory::forUser($userId)
            ->whereIn('id', $ids ?: [0])
            ->pluck('name', 'id');

        $rows = [];
        foreach ($ids as $id) {
            $planCents = $caps[$id] ?? 0;
            $actualCents = $actuals[$id]['cents'] ?? 0;
            $rows[] = [
                'category_id' => $id,
                'name' => $actuals[$id]['name'] ?? $names[$id] ?? 'Uncategorized',
                'plan_cents' => $planCents,
                'actual_cents' => $actualCents,
                'left_cents' => $planCents - $actualCents,
                'has_cap' => array_key_exists($id, $caps),
            ];
        }

        usort($rows, fn (array $a, array $b) => strcasecmp($a['name'], $b['name']));

        return $rows;
    }

    /**
     * @return array{
     *   auto: bool,
     *   plan_cents: int,
     *   charged_cents: int,
     *   projected_cents: int,
     *   streams: list<array{name: string, charged_cents: int, remaining_cents: int}>
     * }
     */
    /**
     * @param  array<string, mixed>  $expanded
     */
    private function billsBlock(array $expanded, ?BudgetPlan $plan): array
    {
        $recurring = $expanded['recurring_payments'];
        $charged = (int) ($recurring['charged_total_cents'] ?? $recurring['total_cents'] ?? 0);
        $projected = (int) ($recurring['projected_total_cents'] ?? 0);
        $autoPlan = $charged + $projected;
        $manual = $plan?->bills_cents;
        $auto = $manual === null;

        $streams = [];
        $chargedByName = [];
        foreach ($recurring['streams'] ?? [] as $stream) {
            $name = (string) ($stream['stream_name'] ?? 'Recurring');
            $chargedByName[$name] = (int) ($stream['total_cents'] ?? 0);
        }
        $remainingByName = [];
        foreach ($recurring['projected'] ?? [] as $stream) {
            $name = (string) ($stream['stream_name'] ?? 'Recurring');
            $remainingByName[$name] = (int) ($stream['total_cents'] ?? 0);
        }
        $names = array_unique([...array_keys($chargedByName), ...array_keys($remainingByName)]);
        sort($names);
        foreach ($names as $name) {
            $streams[] = [
                'name' => $name,
                'charged_cents' => $chargedByName[$name] ?? 0,
                'remaining_cents' => $remainingByName[$name] ?? 0,
            ];
        }

        return [
            'auto' => $auto,
            'plan_cents' => $auto ? $autoPlan : (int) $manual,
            'charged_cents' => $charged,
            'projected_cents' => $projected,
            'streams' => $streams,
        ];
    }

    /**
     * @param  array<string, mixed>  $expanded
     * @return array{
     *   remaining_cents: int,
     *   plan_cents: int|null,
     *   paid_cents: int,
     *   open: list<array{id: int, name: string, remaining_cents: int, original_cents: int, paid_this_month_cents: int}>
     * }
     */
    private function debtsBlock(int $userId, array $expanded, ?BudgetPlan $plan): array
    {
        $paid = (int) ($expanded['debt']['total_cents'] ?? 0);
        $paidById = [];
        foreach ($expanded['debt']['debts'] ?? [] as $row) {
            $paidById[(int) ($row['id'] ?? 0)] = (int) ($row['total_paid_in_period_cents'] ?? 0);
        }

        $remaining = 0;
        $open = [];
        $debts = Debt::query()->forUser($userId)->with('payments')->get();
        foreach ($debts as $debt) {
            if ($debt->is_closed) {
                continue;
            }
            $left = $debt->remaining_cents;
            $remaining += $left;
            $name = trim((string) $debt->description);
            $open[] = [
                'id' => $debt->id,
                'name' => $name !== '' ? $name : 'Untitled debt',
                'remaining_cents' => $left,
                'original_cents' => MoneyCents::fromMajor($debt->amount),
                'paid_this_month_cents' => $paidById[$debt->id] ?? 0,
            ];
        }

        usort($open, fn (array $a, array $b) => strcasecmp($a['name'], $b['name']));

        return [
            'remaining_cents' => $remaining,
            'plan_cents' => $plan?->debt_payment_cents,
            'paid_cents' => $paid,
            'open' => $open,
        ];
    }
}
