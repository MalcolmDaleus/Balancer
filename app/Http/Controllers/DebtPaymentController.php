<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreDebtPaymentRequest;
use App\Http\Requests\Api\UpdateDebtPaymentRequest;
use App\Http\Resources\DebtPaymentResource;
use App\Models\Debt;
use App\Models\DebtPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DebtPaymentController extends Controller
{
    public function index(Debt $debt): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [DebtPayment::class, $debt]);

        $payments = $debt->payments()->latest('paid_at')->get();

        return DebtPaymentResource::collection($payments);
    }

    public function store(StoreDebtPaymentRequest $request, Debt $debt): DebtPaymentResource
    {
        $this->authorize('create', [DebtPayment::class, $debt]);

        $payment = DebtPayment::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id(), 'debt_id' => $debt->id]
        ));

        return new DebtPaymentResource($payment);
    }

    public function show(DebtPayment $debtPayment): DebtPaymentResource
    {
        $this->authorize('view', $debtPayment);

        return new DebtPaymentResource($debtPayment);
    }

    public function update(UpdateDebtPaymentRequest $request, DebtPayment $debtPayment): DebtPaymentResource
    {
        $this->authorize('update', $debtPayment);

        $debtPayment->update($request->validated());

        return new DebtPaymentResource($debtPayment->fresh());
    }

    public function destroy(DebtPayment $debtPayment): JsonResponse
    {
        $this->authorize('delete', $debtPayment);

        $debtPayment->delete();

        return response()->json(null, 204);
    }
}
