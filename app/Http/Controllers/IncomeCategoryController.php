<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreIncomeCategoryRequest;
use App\Http\Requests\Api\UpdateIncomeCategoryRequest;
use App\Http\Resources\IncomeCategoryResource;
use App\Models\IncomeCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IncomeCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', IncomeCategory::class);

        $categories = IncomeCategory::where('user_id', auth()->id())
            ->orderBy('category_name')
            ->get();

        return IncomeCategoryResource::collection($categories);
    }

    public function store(StoreIncomeCategoryRequest $request): IncomeCategoryResource
    {
        $this->authorize('create', IncomeCategory::class);

        $category = IncomeCategory::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new IncomeCategoryResource($category);
    }

    public function show(IncomeCategory $incomeCategory): IncomeCategoryResource
    {
        $this->authorize('view', $incomeCategory);

        return new IncomeCategoryResource($incomeCategory);
    }

    public function update(UpdateIncomeCategoryRequest $request, IncomeCategory $incomeCategory): IncomeCategoryResource
    {
        $this->authorize('update', $incomeCategory);

        $incomeCategory->update($request->validated());

        return new IncomeCategoryResource($incomeCategory->fresh());
    }

    public function destroy(IncomeCategory $incomeCategory): JsonResponse
    {
        $this->authorize('delete', $incomeCategory);

        $incomeCategory->delete();

        return response()->json(null, 204);
    }
}
