<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreIncomeEntryRequest;
use App\Http\Requests\Api\UpdateIncomeEntryRequest;
use App\Http\Resources\IncomeEntryResource;
use App\Models\IncomeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IncomeEntryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', IncomeEntry::class);

        $entries = IncomeEntry::where('user_id', auth()->id())
            ->with(['stream', 'sourcePurchase'])
            ->latest('month')
            ->get();

        return IncomeEntryResource::collection($entries);
    }

    public function store(StoreIncomeEntryRequest $request): IncomeEntryResource
    {
        $this->authorize('create', IncomeEntry::class);

        $entry = IncomeEntry::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new IncomeEntryResource($entry->load(['stream', 'sourcePurchase']));
    }

    public function show(IncomeEntry $incomeEntry): IncomeEntryResource
    {
        $this->authorize('view', $incomeEntry);

        return new IncomeEntryResource($incomeEntry->load(['stream', 'sourcePurchase']));
    }

    public function update(UpdateIncomeEntryRequest $request, IncomeEntry $incomeEntry): IncomeEntryResource
    {
        $this->authorize('update', $incomeEntry);

        $incomeEntry->update($request->validated());

        return new IncomeEntryResource($incomeEntry->fresh()->load(['stream', 'sourcePurchase']));
    }

    public function destroy(IncomeEntry $incomeEntry): JsonResponse
    {
        $this->authorize('delete', $incomeEntry);

        $incomeEntry->delete();

        return response()->json(null, 204);
    }
}
