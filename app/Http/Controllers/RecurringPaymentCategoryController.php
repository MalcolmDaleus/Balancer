<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRecurringPaymentCategoryRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentCategoryRequest;
use App\Http\Resources\RecurringPaymentCategoryResource;
use App\Models\RecurringPaymentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecurringPaymentCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPaymentCategory::class);

        $categories = RecurringPaymentCategory::where('user_id', auth()->id())
            ->orderBy('name')
            ->get();

        return RecurringPaymentCategoryResource::collection($categories);
    }

    /**
     * Create or reactivate a category.
     * If a soft-deleted category with the same (case-insensitive) name exists, restore it.
     */
    public function store(StoreRecurringPaymentCategoryRequest $request): RecurringPaymentCategoryResource
    {
        $this->authorize('create', RecurringPaymentCategory::class);

        $userId = auth()->id();
        $name   = $request->input('name');

        $existing = RecurringPaymentCategory::withTrashed()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(name) = LOWER(?)', [$name])
            ->first();

        if ($existing && $existing->trashed()) {
            $existing->restore();
            return new RecurringPaymentCategoryResource($existing->fresh());
        }

        $category = RecurringPaymentCategory::create(array_merge(
            $request->validated(),
            ['user_id' => $userId]
        ));

        return new RecurringPaymentCategoryResource($category);
    }

    public function show(RecurringPaymentCategory $recurringPaymentCategory): RecurringPaymentCategoryResource
    {
        $this->authorize('view', $recurringPaymentCategory);

        return new RecurringPaymentCategoryResource($recurringPaymentCategory);
    }

    /**
     * Soft update / rename.
     *
     * Recurring Facts stamp `category_name` at materialization time, so renaming
     * this classifier does not rewrite locked-month history. Unlike purchase/debt
     * categories (no Fact-level name stamp), rename is allowed even when the
     * category was used in a closed month. Future charges pick up the new name.
     */
    public function update(UpdateRecurringPaymentCategoryRequest $request, RecurringPaymentCategory $recurringPaymentCategory): RecurringPaymentCategoryResource
    {
        $this->authorize('update', $recurringPaymentCategory);

        $recurringPaymentCategory->update($request->validated());

        return new RecurringPaymentCategoryResource($recurringPaymentCategory->fresh());
    }

    /**
     * Soft delete if streams reference it; otherwise hard delete.
     */
    public function destroy(RecurringPaymentCategory $recurringPaymentCategory): JsonResponse
    {
        $this->authorize('delete', $recurringPaymentCategory);

        if ($recurringPaymentCategory->streams()->exists()) {
            $recurringPaymentCategory->delete();
        } else {
            $recurringPaymentCategory->forceDelete();
        }

        return response()->json(null, 204);
    }
}
