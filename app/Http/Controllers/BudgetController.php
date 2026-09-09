<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\BalanceSheetMonthQueryRequest;
use App\Http\Requests\Api\UpsertBudgetRequest;
use App\Models\BudgetPlan;
use App\Services\BudgetService;
use App\Services\DateTimeService;
use Illuminate\Http\JsonResponse;

class BudgetController extends Controller
{
    public function __construct(
        private readonly BudgetService $budgets,
    ) {}

    public function show(BalanceSheetMonthQueryRequest $request): JsonResponse
    {
        $this->authorize('viewAny', BudgetPlan::class);

        $month = DateTimeService::normalizeMonth($request->validated('month'));

        return response()->json($this->budgets->show((int) $request->user()->id, $month));
    }

    public function upsert(UpsertBudgetRequest $request): JsonResponse
    {
        $this->authorize('create', BudgetPlan::class);

        $data = $request->validated();
        $month = DateTimeService::normalizeMonth($data['month'] ?? null);

        return response()->json(
            $this->budgets->upsert((int) $request->user()->id, $month, $data)
        );
    }

    public function destroy(BalanceSheetMonthQueryRequest $request): JsonResponse
    {
        $this->authorize('deleteAny', BudgetPlan::class);

        $month = DateTimeService::normalizeMonth($request->validated('month'));
        $this->budgets->destroy((int) $request->user()->id, $month);

        return response()->json(null, 204);
    }
}
