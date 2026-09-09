<?php

namespace App\Services;

use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\Saving;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Canonical union of Fact rows for Statistics and the Ledger Feed.
 *
 * Maps each domain table onto the shared Fact taxonomy (not a physical mega-table).
 */
class FinancialFlowReadModel
{
    /**
     * @return Collection<int, array{
     *   domain: string,
     *   kind: string,
     *   occurred_on: string,
     *   amount_cents: int,
     *   direction: string,
     *   classifier_id: int|null,
     *   classifier_name: string|null,
     *   instrument_id: int|null,
     *   source_id: int,
     *   label: string|null
     * }>
     */
    public function forUser(int $userId, Carbon|string|null $from = null, Carbon|string|null $to = null): Collection
    {
        $from = $from ? Carbon::parse($from)->startOfDay() : null;
        $to = $to ? Carbon::parse($to)->endOfDay() : null;

        return collect()
            ->concat($this->incomeFacts($userId, $from, $to))
            ->concat($this->spendingFacts($userId, $from, $to))
            ->concat($this->recurringFacts($userId, $from, $to))
            ->concat($this->debtPaymentFacts($userId, $from, $to))
            ->concat($this->savingsFacts($userId, $from, $to))
            ->sortBy([
                ['occurred_on', 'asc'],
                ['source_id', 'asc'],
            ])
            ->values();
    }

    /**
     * Ledger Feed: same Facts, newest first, with list filters.
     *
     * @param  array{
     *   from?: Carbon|string|null,
     *   to?: Carbon|string|null,
     *   q?: string|null,
     *   domain?: string|null,
     *   amount_min_cents?: int|null,
     *   amount_max_cents?: int|null
     * }  $filters
     * @return Collection<int, array<string, mixed>>
     */
    public function forFeed(int $userId, array $filters = []): Collection
    {
        $from = $filters['from'] ?? Carbon::now('UTC')->startOfMonth();
        $to = $filters['to'] ?? Carbon::now('UTC')->endOfMonth();
        $q = isset($filters['q']) ? mb_strtolower(trim((string) $filters['q'])) : '';
        $domain = $filters['domain'] ?? null;
        $min = $filters['amount_min_cents'] ?? null;
        $max = $filters['amount_max_cents'] ?? null;

        $facts = $this->forUser($userId, $from, $to);

        if (is_string($domain) && $domain !== '') {
            $facts = $facts->where('domain', $domain)->values();
        }

        if ($q !== '') {
            $facts = $facts->filter(function (array $fact) use ($q): bool {
                $hay = mb_strtolower(implode(' ', array_filter([
                    $fact['label'] ?? null,
                    $fact['detail'] ?? null,
                    $fact['classifier_name'] ?? null,
                ])));

                return str_contains($hay, $q);
            })->values();
        }

        if (is_int($min)) {
            $facts = $facts->filter(fn (array $fact): bool => $fact['amount_cents'] >= $min)->values();
        }
        if (is_int($max)) {
            $facts = $facts->filter(fn (array $fact): bool => $fact['amount_cents'] <= $max)->values();
        }

        return $facts
            ->sortByDesc(fn (array $fact): string => $fact['occurred_on'].'-'.$fact['source_id'])
            ->values();
    }

    private function incomeFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = IncomeEntry::where('user_id', $userId);
        if ($from) {
            $q->whereDate('received_at', '>=', $from->toDateString());
        }
        if ($to) {
            $q->whereDate('received_at', '<=', $to->toDateString());
        }

        return $q->get()->map(fn (IncomeEntry $e) => [
            'domain' => 'income',
            'kind' => (string) ($e->type?->value ?? $e->type),
            'occurred_on' => $e->received_at?->toDateString(),
            'amount_cents' => MoneyCents::fromMajor($e->amount),
            'direction' => 'in',
            'classifier_id' => null,
            'classifier_name' => null,
            'instrument_id' => $e->regular_schedule_id,
            'source_id' => $e->id,
            'label' => $e->name,
            'detail' => $e->description,
        ]);
    }

    private function spendingFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = Purchase::where('user_id', $userId)->with('category');
        if ($from) {
            $q->whereDate('date', '>=', $from->toDateString());
        }
        if ($to) {
            $q->whereDate('date', '<=', $to->toDateString());
        }

        return $q->get()->map(fn (Purchase $p) => [
            'domain' => 'spending',
            'kind' => 'one_off_purchase',
            'occurred_on' => $p->date?->toDateString(),
            'amount_cents' => MoneyCents::fromMajor($p->amount),
            'direction' => 'out',
            'classifier_id' => $p->category_id,
            'classifier_name' => $p->category?->name,
            'instrument_id' => null,
            'source_id' => $p->id,
            'label' => $p->description,
            'detail' => null,
        ]);
    }

    private function recurringFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = RecurringCharge::where('user_id', $userId);
        if ($from) {
            $q->whereDate('occurred_on', '>=', $from->toDateString());
        }
        if ($to) {
            $q->whereDate('occurred_on', '<=', $to->toDateString());
        }

        return $q->get()->map(fn (RecurringCharge $c) => [
            'domain' => 'recurring',
            'kind' => 'recurring_charge',
            'occurred_on' => $c->occurred_on?->toDateString(),
            'amount_cents' => MoneyCents::fromMajor($c->amount),
            'direction' => 'out',
            'classifier_id' => $c->recurring_payment_category_id,
            'classifier_name' => $c->category_name,
            'instrument_id' => $c->recurring_payment_stream_id,
            'source_id' => $c->id,
            'label' => $c->stream_name,
            'detail' => null,
        ]);
    }

    private function debtPaymentFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = DebtPayment::where('user_id', $userId)
            ->with(['debt' => fn ($rel) => $rel->withTrashed()]);
        if ($from) {
            $q->whereDate('paid_at', '>=', $from->toDateString());
        }
        if ($to) {
            $q->whereDate('paid_at', '<=', $to->toDateString());
        }

        return $q->get()->map(fn (DebtPayment $p) => [
            'domain' => 'debt',
            'kind' => 'debt_payment',
            'occurred_on' => $p->paid_at?->toDateString(),
            'amount_cents' => MoneyCents::fromMajor($p->amount),
            'direction' => 'out',
            'classifier_id' => null,
            'classifier_name' => null,
            'instrument_id' => $p->debt_id,
            'source_id' => $p->id,
            'label' => $p->debt?->description,
            'detail' => $p->notes,
        ]);
    }

    private function savingsFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = Saving::where('user_id', $userId);
        if ($from) {
            $q->whereDate('month', '>=', $from->copy()->startOfMonth()->toDateString());
        }
        if ($to) {
            $q->whereDate('month', '<=', $to->copy()->startOfMonth()->toDateString());
        }

        return $q->get()->map(fn (Saving $s) => [
            'domain' => 'savings',
            'kind' => (string) $s->type,
            'occurred_on' => $s->month?->toDateString(),
            'amount_cents' => MoneyCents::fromMajor($s->amount),
            'direction' => $s->type === 'withdrawal' ? 'out' : 'in',
            'classifier_id' => null,
            'classifier_name' => null,
            'instrument_id' => null,
            'source_id' => $s->id,
            'label' => $s->notes,
            'detail' => null,
        ]);
    }
}
