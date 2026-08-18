<?php

namespace App\Http\Controllers;

use App\Exceptions\DomainException;
use App\Http\Requests\Api\StorePurchaseCategoryRequest;
use App\Http\Requests\Api\UpdatePurchaseCategoryRequest;
use App\Http\Resources\PurchaseCategoryResource;
use App\Models\BalanceSheetTotal;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseCategory::class);

        $categories = PurchaseCategory::where('user_id', auth()->id())
            ->orderBy('name')
            ->get();

        return PurchaseCategoryResource::collection($categories);
    }

    public function store(StorePurchaseCategoryRequest $request): PurchaseCategoryResource
    {
        $this->authorize('create', PurchaseCategory::class);

        $userId = auth()->id();
        $name = $request->input('name');

        $existing = PurchaseCategory::withTrashed()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(name) = LOWER(?)', [$name])
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

        $newName = $request->input('name');
        if ($newName !== $purchaseCategory->name && $this->usedInLockedMonth($purchaseCategory)) {
            throw new DomainException(
                'classifier_locked',
                'This category is used in a closed month and cannot be renamed.',
                423,
            );
        }

        $purchaseCategory->update($request->validated());

        return new PurchaseCategoryResource($purchaseCategory->fresh());
    }

    public function destroy(PurchaseCategory $purchaseCategory): JsonResponse
    {
        $this->authorize('delete', $purchaseCategory);

        if ($purchaseCategory->purchases()->exists()) {
            $purchaseCategory->delete();
        } else {
            $purchaseCategory->forceDelete();
        }

        return response()->json(null, 204);
    }

    private function usedInLockedMonth(PurchaseCategory $category): bool
    {
        $lockedMonths = BalanceSheetTotal::where('user_id', $category->user_id)
            ->pluck('month')
            ->map(fn ($m) => \Carbon\Carbon::parse($m)->format('Y-m'));

        if ($lockedMonths->isEmpty()) {
            return false;
        }

        return Purchase::where('category_id', $category->id)
            ->where('user_id', $category->user_id)
            ->get()
            ->contains(fn (Purchase $p) => $lockedMonths->contains($p->date?->format('Y-m')));
    }
}
