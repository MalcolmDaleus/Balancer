<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreDebtCategoryRequest;
use App\Http\Requests\Api\UpdateDebtCategoryRequest;
use App\Http\Resources\DebtCategoryResource;
use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\DebtCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DebtCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', DebtCategory::class);

        $categories = DebtCategory::where('user_id', auth()->id())
            ->orderBy('name')
            ->get();

        return DebtCategoryResource::collection($categories);
    }

    public function store(StoreDebtCategoryRequest $request): DebtCategoryResource
    {
        $this->authorize('create', DebtCategory::class);

        $userId = auth()->id();
        $name = $request->input('name');

        $existing = DebtCategory::withTrashed()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(name) = LOWER(?)', [$name])
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

    public function update(UpdateDebtCategoryRequest $request, DebtCategory $debtCategory): DebtCategoryResource|JsonResponse
    {
        $this->authorize('update', $debtCategory);

        $newName = $request->input('name');
        if ($newName !== $debtCategory->name && $this->usedInLockedMonth($debtCategory)) {
            return response()->json([
                'error'   => 'classifier_locked',
                'message' => 'This category is used in a closed month and cannot be renamed.',
            ], 423);
        }

        $debtCategory->update($request->validated());

        return new DebtCategoryResource($debtCategory->fresh());
    }

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

    private function usedInLockedMonth(DebtCategory $category): bool
    {
        $lockedMonths = BalanceSheetTotal::where('user_id', $category->user_id)
            ->pluck('month')
            ->map(fn ($m) => \Carbon\Carbon::parse($m)->format('Y-m'));

        if ($lockedMonths->isEmpty()) {
            return false;
        }

        return Debt::withTrashed()
            ->where('category_id', $category->id)
            ->where('user_id', $category->user_id)
            ->get()
            ->contains(fn (Debt $d) => $lockedMonths->contains($d->issue_date?->format('Y-m')));
    }
}
