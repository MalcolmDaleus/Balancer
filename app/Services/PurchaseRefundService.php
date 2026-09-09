<?php

namespace App\Services;

use App\Enums\IncomeEntryType;
use App\Exceptions\DomainException;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Record refunds against purchases (dual-Fact: purchase stays, refund income posts).
 */
class PurchaseRefundService
{
    /**
     * Apply a full or partial refund and create the linked income entry.
     *
     * $requestedAmount is cents when int, otherwise a major-unit value (seeders).
     *
     * @throws DomainException already_refunded|nothing_to_refund|invalid_amount
     */
    public function refund(
        Purchase $purchase,
        int $userId,
        float|int|string|null $requestedAmount = null,
        Carbon|string|null $refundDate = null,
    ): Purchase {
        $purchase->loadMissing('refundIncomeEntries');

        if ($purchase->is_refunded) {
            throw new DomainException('already_refunded', 'This purchase has already been fully refunded.');
        }

        $remaining = $purchase->remaining_refundable_cents;

        if ($remaining <= 0) {
            throw new DomainException('nothing_to_refund', 'There is no remaining balance to refund.');
        }

        $refundDate = $refundDate
            ? Carbon::parse($refundDate)
            : now();

        $refundCents = $requestedAmount === null
            ? $remaining
            : min(
                is_int($requestedAmount) ? $requestedAmount : MoneyCents::fromMajor($requestedAmount),
                $remaining,
            );

        if ($refundCents <= 0) {
            throw new DomainException('invalid_amount', 'Refund amount must be greater than zero.');
        }

        DB::transaction(function () use ($purchase, $refundDate, $refundCents, $userId) {
            IncomeEntry::create([
                'user_id' => $userId,
                'type' => IncomeEntryType::Refund,
                'name' => 'Refund: '.$purchase->description,
                'amount' => MoneyCents::toMajorString($refundCents),
                'received_at' => $refundDate->toDateString(),
                'purchase_id' => $purchase->id,
            ]);

            $purchase->load('refundIncomeEntries');
            $fullyRefunded = $purchase->remaining_refundable_cents <= 0;

            if ($fullyRefunded) {
                $purchase->update(['is_refunded' => true]);
            }
        });

        return $purchase->refresh()->load(['category', 'refundIncomeEntries']);
    }
}
