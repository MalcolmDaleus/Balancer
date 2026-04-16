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
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseCategory::class);

        $categories = PurchaseCategory::where('user_id', auth()->id())
            ->orderBy('category_name')
            ->get();

        return PurchaseCategoryResource::collection($categories);
    }

    public function store(StorePurchaseCategoryRequest $request): PurchaseCategoryResource
    {
        $this->authorize('create', PurchaseCategory::class);

        $category = PurchaseCategory::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
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

    public function destroy(PurchaseCategory $purchaseCategory): JsonResponse
    {
        $this->authorize('delete', $purchaseCategory);

        $purchaseCategory->delete();

        return response()->json(null, 204);
    }
}
