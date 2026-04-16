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

        $userId = auth()->id();
        $name   = $request->input('category_name');

        $existing = DebtCategory::withTrashed()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(category_name) = LOWER(?)', [$name])
            ->first();

        if ($existing && $existing->trashed()) {
            $existing->restore();
            return new DebtCategoryResource($existing->fresh());
        }

        $category = DebtCategory::create(array_merge(
            $request->validated(),
            ['user_id' => $userId]
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

    /**
     * Soft delete if debts reference the category; hard delete if unused.
     */
    public function destroy(DebtCategory $debtCategory): JsonResponse
    {
        $this->authorize('delete', $debtCategory);

        if ($debtCategory->debts()->exists()) {
            $debtCategory->delete();
        } else {
            $debtCategory->forceDelete();
        }

        return response()->json(null, 204);
    }
}
