<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreDebtCategoryRequest;
use App\Http\Requests\Api\UpdateDebtCategoryRequest;
use App\Http\Resources\DebtCategoryResource;
use App\Models\DebtCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DebtCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', DebtCategory::class);

        $categories = DebtCategory::where('user_id', auth()->id())
            ->orderBy('category_name')
            ->get();

        return DebtCategoryResource::collection($categories);
    }

    public function store(StoreDebtCategoryRequest $request): DebtCategoryResource
    {
        $this->authorize('create', DebtCategory::class);

        $category = DebtCategory::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new DebtCategoryResource($category);
    }

    public function show(DebtCategory $debtCategory): DebtCategoryResource
    {
        $this->authorize('view', $debtCategory);

        return new DebtCategoryResource($debtCategory);
    }

    public function update(UpdateDebtCategoryRequest $request, DebtCategory $debtCategory): DebtCategoryResource
    {
        $this->authorize('update', $debtCategory);

        $debtCategory->update($request->validated());

        return new DebtCategoryResource($debtCategory->fresh());
    }

    public function destroy(DebtCategory $debtCategory): JsonResponse
    {
        $this->authorize('delete', $debtCategory);

        $debtCategory->delete();

        return response()->json(null, 204);
    }
}
