<?php

namespace App\Services;

use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\Saving;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Canonical union of Fact rows for Statistics / unified feeds.
 *
 * Internal foundation for the Statistics product wave — not wired to HTTP yet.
 * Do not add routes until that wave.
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
     *   amount: float,
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
            ->sortBy('occurred_on')
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
            'domain'          => 'income',
            'kind'            => (string) ($e->type?->value ?? $e->type),
            'occurred_on'     => $e->received_at?->toDateString(),
            'amount'          => (float) $e->amount,
            'direction'       => 'in',
            'classifier_id'   => null,
            'classifier_name' => null,
            'instrument_id'   => $e->regular_schedule_id,
            'source_id'       => $e->id,
            'label'           => $e->name,
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
            'domain'          => 'spending',
            'kind'            => 'one_off_purchase',
            'occurred_on'     => $p->date?->toDateString(),
            'amount'          => (float) $p->amount,
            'direction'       => 'out',
            'classifier_id'   => $p->category_id,
            'classifier_name' => $p->category?->name,
            'instrument_id'   => null,
            'source_id'       => $p->id,
            'label'           => $p->description,
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
            'domain'          => 'recurring',
            'kind'            => 'recurring_charge',
            'occurred_on'     => $c->occurred_on?->toDateString(),
            'amount'          => (float) $c->amount,
            'direction'       => 'out',
            'classifier_id'   => $c->recurring_payment_category_id,
            'classifier_name' => $c->category_name,
            'instrument_id'   => $c->recurring_payment_stream_id,
            'source_id'       => $c->id,
            'label'           => $c->stream_name,
        ]);
    }

    private function debtPaymentFacts(int $userId, ?Carbon $from, ?Carbon $to): Collection
    {
        $q = DebtPayment::where('user_id', $userId);
        if ($from) {
            $q->whereDate('paid_at', '>=', $from->toDateString());
        }
        if ($to) {
            $q->whereDate('paid_at', '<=', $to->toDateString());
        }

        return $q->get()->map(fn (DebtPayment $p) => [
            'domain'          => 'debt',
            'kind'            => 'debt_payment',
            'occurred_on'     => $p->paid_at?->toDateString(),
            'amount'          => (float) $p->amount,
            'direction'       => 'out',
            'classifier_id'   => null,
            'classifier_name' => null,
            'instrument_id'   => $p->debt_id,
            'source_id'       => $p->id,
            'label'           => null,
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
            'domain'          => 'savings',
            'kind'            => (string) $s->type,
            'occurred_on'     => $s->month?->toDateString(),
            'amount'          => (float) $s->amount,
            'direction'       => $s->type === 'withdrawal' ? 'out' : 'in',
            'classifier_id'   => null,
            'classifier_name' => null,
            'instrument_id'   => null,
            'source_id'       => $s->id,
            'label'           => $s->notes,
        ]);
    }
}
