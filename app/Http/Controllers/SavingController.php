<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreSavingRequest;
use App\Http\Requests\Api\UpdateSavingRequest;
use App\Http\Resources\SavingResource;
use App\Models\Saving;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SavingController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Saving::class);

        $savings = Saving::where('user_id', auth()->id())
            ->latest('month')
            ->get();

        return SavingResource::collection($savings);
    }

    public function store(StoreSavingRequest $request): SavingResource
    {
        $this->authorize('create', Saving::class);

        $saving = Saving::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new SavingResource($saving);
    }

    public function show(Saving $saving): SavingResource
    {
        $this->authorize('view', $saving);

        return new SavingResource($saving);
    }

    public function update(UpdateSavingRequest $request, Saving $saving): SavingResource
    {
        $this->authorize('update', $saving);

        $saving->update($request->validated());

        return new SavingResource($saving->fresh());
    }

    public function destroy(Saving $saving): JsonResponse
    {
        $this->authorize('delete', $saving);

        $saving->delete();

        return response()->json(null, 204);
    }
}
