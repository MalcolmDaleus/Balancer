<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreDebtRequest;
use App\Http\Requests\Api\UpdateDebtRequest;
use App\Http\Resources\DebtResource;
use App\Models\Debt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DebtController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Debt::class);

        $debts = Debt::where('user_id', auth()->id())
            ->with(['category', 'payments'])
            ->latest('issue_date')
            ->get();

        return DebtResource::collection($debts);
    }

    public function store(StoreDebtRequest $request): DebtResource
    {
        $this->authorize('create', Debt::class);

        $debt = Debt::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new DebtResource($debt->load(['category', 'payments']));
    }

    public function show(Debt $debt): DebtResource
    {
        $this->authorize('view', $debt);

        return new DebtResource($debt->load(['category', 'payments']));
    }

    public function update(UpdateDebtRequest $request, Debt $debt): DebtResource
    {
        $this->authorize('update', $debt);

        $debt->update($request->validated());

        return new DebtResource($debt->fresh()->load(['category', 'payments']));
    }

    public function destroy(Debt $debt): JsonResponse
    {
        $this->authorize('delete', $debt);

        $debt->delete();

        return response()->json(null, 204);
    }
}
