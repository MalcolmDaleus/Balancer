<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRecurringPurchaseRequest;
use App\Http\Requests\Api\UpdateRecurringPurchaseRequest;
use App\Http\Resources\RecurringPurchaseResource;
use App\Models\RecurringPurchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecurringPurchaseController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPurchase::class);

        $rps = RecurringPurchase::where('user_id', auth()->id())
            ->with('category')
            ->orderBy('description')
            ->get();

        return RecurringPurchaseResource::collection($rps);
    }

    public function store(StoreRecurringPurchaseRequest $request): RecurringPurchaseResource
    {
        $this->authorize('create', RecurringPurchase::class);

        $rp = RecurringPurchase::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new RecurringPurchaseResource($rp->load('category'));
    }

    public function show(RecurringPurchase $recurringPurchase): RecurringPurchaseResource
    {
        $this->authorize('view', $recurringPurchase);

        return new RecurringPurchaseResource($recurringPurchase->load('category'));
    }

    public function update(UpdateRecurringPurchaseRequest $request, RecurringPurchase $recurringPurchase): RecurringPurchaseResource
    {
        $this->authorize('update', $recurringPurchase);

        $recurringPurchase->update($request->validated());

        return new RecurringPurchaseResource($recurringPurchase->fresh()->load('category'));
    }

    public function destroy(RecurringPurchase $recurringPurchase): JsonResponse
    {
        $this->authorize('delete', $recurringPurchase);

        $recurringPurchase->delete();

        return response()->json(null, 204);
    }
}
