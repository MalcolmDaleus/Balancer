<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StorePurchaseCategoryRequest;
use App\Http\Requests\Api\UpdatePurchaseCategoryRequest;
use App\Http\Resources\PurchaseCategoryResource;
use App\Models\PurchaseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseCategoryController extends Controller
{
    /**
     * List only non-soft-deleted categories for this user.
     */
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseCategory::class);

        $categories = PurchaseCategory::where('user_id', auth()->id())
            ->orderBy('category_name')
            ->get();

        return PurchaseCategoryResource::collection($categories);
    }

    /**
     * Create a category.
     *
     * If a soft-deleted category with the same (case-insensitive) name already exists
     * for this user it is restored instead of creating a duplicate.
     */
    public function store(StorePurchaseCategoryRequest $request): PurchaseCategoryResource
    {
        $this->authorize('create', PurchaseCategory::class);

        $userId = auth()->id();
        $name   = $request->input('category_name');

        // Reactivation: restore soft-deleted category if same name exists
        $existing = PurchaseCategory::withTrashed()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(category_name) = LOWER(?)', [$name])
            ->first();

        if ($existing && $existing->trashed()) {
            $existing->restore();
            return new PurchaseCategoryResource($existing->fresh());
        }

        $category = PurchaseCategory::create(array_merge(
            $request->validated(),
            ['user_id' => $userId]
        ));

        return new PurchaseCategoryResource($category);
    }

    public function show(PurchaseCategory $purchaseCategory): PurchaseCategoryResource
    {
        $this->authorize('view', $purchaseCategory);

        return new PurchaseCategoryResource($purchaseCategory);
    }

    public function update(UpdatePurchaseCategoryRequest $request, PurchaseCategory $purchaseCategory): PurchaseCategoryResource
    {
        $this->authorize('update', $purchaseCategory);

        $purchaseCategory->update($request->validated());

        return new PurchaseCategoryResource($purchaseCategory->fresh());
    }

    /**
     * Delete a category.
     *
     * Hard delete if no purchases reference it (safe — no orphans).
     * Soft delete if purchases exist — the category stays for historical accuracy
     * but is hidden from pickers.
     */
    public function destroy(PurchaseCategory $purchaseCategory): JsonResponse
    {
        $this->authorize('delete', $purchaseCategory);

        if ($purchaseCategory->purchases()->exists()) {
            $purchaseCategory->delete(); // soft delete
        } else {
            $purchaseCategory->forceDelete();
        }

        return response()->json(null, 204);
    }
}
