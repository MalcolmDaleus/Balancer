<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\RefundPurchaseRequest;
use App\Http\Requests\Api\StorePurchaseRequest;
use App\Http\Requests\Api\UpdatePurchaseRequest;
use App\Http\Resources\PurchaseResource;
use App\Models\IncomeEntry;
use App\Models\IncomeStream;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Purchase::class);

        $purchases = Purchase::where('user_id', auth()->id())
            ->with(['category', 'refundIncomeEntries'])
            ->latest('date')
            ->get();

        return PurchaseResource::collection($purchases);
    }

    public function store(StorePurchaseRequest $request): PurchaseResource
    {
        $this->authorize('create', Purchase::class);

        $purchase = Purchase::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new PurchaseResource($purchase->refresh()->load(['category', 'refundIncomeEntries']));
    }

    public function show(Purchase $purchase): PurchaseResource
    {
        $this->authorize('view', $purchase);

        return new PurchaseResource($purchase->load(['category', 'refundIncomeEntries']));
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase): PurchaseResource
    {
        $this->authorize('update', $purchase);

        $purchase->update($request->validated());

        return new PurchaseResource($purchase->fresh()->load(['category', 'refundIncomeEntries']));
    }

    public function destroy(Purchase $purchase): JsonResponse
    {
        $this->authorize('delete', $purchase);

        $purchase->delete();

        return response()->json(null, 204);
    }

    /**
     * Record a refund against a purchase and create the corresponding income entry.
     *
     * - Spending is never reduced; the purchase amount stays in spending totals.
     * - Each refund creates a new income entry linked via purchase_id.
     * - Omit amount (or send amount >= remaining) to pay off the remaining balance.
     * - is_refunded is set only when cumulative refunds reach the purchase amount.
     */
    public function refund(RefundPurchaseRequest $request, Purchase $purchase): JsonResponse
    {
        $this->authorize('update', $purchase);

        $purchase->loadMissing('refundIncomeEntries');

        if ($purchase->is_refunded) {
            return response()->json(['error' => 'already_refunded', 'message' => 'This purchase has already been fully refunded.'], 422);
        }

        $remaining = $purchase->remaining_refundable;

        if ($remaining <= 0) {
            return response()->json(['error' => 'nothing_to_refund', 'message' => 'There is no remaining balance to refund.'], 422);
        }

        $userId = auth()->id();
        $refundDate = $request->input('refund_date') ? \Carbon\Carbon::parse($request->input('refund_date')) : now();

        $requested = $request->input('amount');
        $refundAmount = $requested === null
            ? $remaining
            : min((float) $requested, $remaining);

        if ($refundAmount <= 0) {
            return response()->json(['error' => 'invalid_amount', 'message' => 'Refund amount must be greater than zero.'], 422);
        }

        $refundStream = IncomeStream::where('user_id', $userId)
            ->where('is_system', true)
            ->where('name', 'Refunds')
            ->first();

        if (! $refundStream) {
            return response()->json(['error' => 'no_refund_stream', 'message' => 'System Refunds income stream not found. Please run seeders.'], 500);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($purchase, $refundStream, $refundDate, $refundAmount, $userId) {
            IncomeEntry::create([
                'user_id'          => $userId,
                'income_stream_id' => $refundStream->id,
                'amount'           => $refundAmount,
                'month'            => $refundDate->copy()->startOfMonth()->toDateString(),
                'purchase_id'      => $purchase->id,
            ]);

            $purchase->load('refundIncomeEntries');
            $fullyRefunded = $purchase->remaining_refundable <= 0;

            if ($fullyRefunded) {
                $purchase->update(['is_refunded' => true]);
            }
        });

        return response()->json([
            'message'  => $purchase->fresh()->is_refunded
                ? 'Purchase fully refunded.'
                : 'Partial refund recorded.',
            'purchase' => new PurchaseResource($purchase->refresh()->load(['category', 'refundIncomeEntries'])),
        ]);
    }
}
