<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\RefundPurchaseRequest;
use App\Http\Requests\Api\StorePurchaseRequest;
use App\Http\Requests\Api\UpdatePurchaseRequest;
use App\Http\Resources\IncomeEntryResource;
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
            ->with('category')
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

        return new PurchaseResource($purchase->refresh()->load('category'));
    }

    public function show(Purchase $purchase): PurchaseResource
    {
        $this->authorize('view', $purchase);

        return new PurchaseResource($purchase->load('category'));
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase): PurchaseResource
    {
        $this->authorize('update', $purchase);

        $purchase->update($request->validated());

        return new PurchaseResource($purchase->fresh()->load('category'));
    }

    public function destroy(Purchase $purchase): JsonResponse
    {
        $this->authorize('delete', $purchase);

        $purchase->delete();

        return response()->json(null, 204);
    }

    /**
     * Mark a purchase as refunded and create the corresponding income entry.
     *
     * - Spending is never reduced; the purchase remains with is_refunded = true.
     * - The refund income entry is linked back to the source purchase via purchase_id.
     * - The refund amount defaults to the full purchase amount if not specified.
     * - The income entry month is based on the refund event date (default: today).
     * - A purchase cannot be refunded twice.
     */
    public function refund(RefundPurchaseRequest $request, Purchase $purchase): JsonResponse
    {
        $this->authorize('update', $purchase);

        if ($purchase->is_refunded) {
            return response()->json(['error' => 'already_refunded', 'message' => 'This purchase has already been refunded.'], 422);
        }

        $userId      = auth()->id();
        $refundDate  = $request->input('refund_date') ? \Carbon\Carbon::parse($request->input('refund_date')) : now();
        $refundAmount = $request->input('amount', $purchase->amount);

        // Find the system Refunds stream for this user
        $refundStream = IncomeStream::where('user_id', $userId)
            ->where('is_system', true)
            ->where('name', 'Refunds')
            ->first();

        if (! $refundStream) {
            return response()->json(['error' => 'no_refund_stream', 'message' => 'System Refunds income stream not found. Please run seeders.'], 500);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($purchase, $refundStream, $refundDate, $refundAmount, $userId) {
            $purchase->update(['is_refunded' => true]);

            IncomeEntry::create([
                'user_id'          => $userId,
                'income_stream_id' => $refundStream->id,
                'amount'           => $refundAmount,
                'month'            => $refundDate->startOfMonth()->toDateString(),
                'purchase_id'      => $purchase->id,
            ]);
        });

        return response()->json([
            'message'  => 'Purchase marked as refunded.',
            'purchase' => new PurchaseResource($purchase->refresh()->load('category')),
        ]);
    }
}
