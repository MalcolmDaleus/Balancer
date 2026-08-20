<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\RefundPurchaseRequest;
use App\Http\Requests\Api\StorePurchaseRequest;
use App\Http\Requests\Api\UpdatePurchaseRequest;
use App\Http\Resources\PurchaseResource;
use App\Models\Purchase;
use App\Services\PurchaseRefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Purchase::class);

        $purchases = Purchase::forUser(auth()->id())
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
     */
    public function refund(
        RefundPurchaseRequest $request,
        Purchase $purchase,
        PurchaseRefundService $refunds,
    ): JsonResponse {
        $this->authorize('update', $purchase);

        $purchase = $refunds->refund(
            $purchase,
            (int) auth()->id(),
            $request->input('amount'),
            $request->input('refund_date'),
        );

        return response()->json([
            'message'  => $purchase->is_refunded
                ? 'Purchase fully refunded.'
                : 'Partial refund recorded.',
            'purchase' => new PurchaseResource($purchase),
        ]);
    }
}
