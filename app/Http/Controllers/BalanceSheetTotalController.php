<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\CloseMonthRequest;
use App\Http\Resources\BalanceSheetTotalResource;
use App\Models\BalanceSheetTotal;
use App\Services\BalanceSheetService;
use App\Services\DateTimeService;
use App\Services\MonthLockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BalanceSheetTotalController extends Controller
{
    /**
     * GET /api/v1/balance-sheet
     *
     * Returns the full expanded balance sheet for the authenticated user.
     * Accepts optional ?month=YYYY-MM query parameter (defaults to current month).
     */
    public function expanded(Request $request): JsonResponse
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        $month = $request->query('month');
        $svc = new BalanceSheetService(auth()->id(), $month);

        return response()->json($svc->getExpanded());
    }

    /**
     * GET /api/v1/balance-sheet/locked-months
     *
     * Returns all closed (locked) months for the authenticated user as YYYY-MM strings.
     */
    public function lockedMonths(): JsonResponse
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        return response()->json([
            'months' => MonthLockService::lockedMonthKeys(auth()->id()),
        ]);
    }

    /**
     * GET /api/v1/balance-sheet/summary
     *
     * Returns the simplified (totals-only) balance sheet snapshot.
     * Accepts optional ?month=YYYY-MM query parameter (defaults to current month).
     */
    public function summary(Request $request): JsonResponse
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        $month = $request->query('month');
        $svc = new BalanceSheetService(auth()->id(), $month);

        return response()->json($svc->getSimplified());
    }

    /**
     * POST /api/v1/balance-sheet/close
     *
     * Persists a snapshot for the given month, effectively locking it.
     * Body: { "month": "YYYY-MM" }
     */
    public function close(CloseMonthRequest $request): \Illuminate\Http\JsonResponse
    {
        $this->authorize('create', BalanceSheetTotal::class);

        $month = DateTimeService::normalizeMonth($request->validated('month'));
        $svc = new BalanceSheetService(auth()->id(), $month);
        $snapshot = $svc->persistSnapshot();

        return (new BalanceSheetTotalResource($snapshot))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/v1/balance-sheet/history
     *
     * Returns the last N closed months (persisted snapshots).
     * Accepts optional ?months=12 query parameter.
     */
    public function history(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        $months = (int) $request->query('months', 12);
        $months = max(1, min($months, 60));

        $svc = new BalanceSheetService(auth()->id());
        $history = $svc->getHistory($months);

        return BalanceSheetTotalResource::collection($history);
    }

    /**
     * GET /api/v1/balance-sheet/compare
     *
     * Compares two months side by side.
     * Query params: ?month_a=YYYY-MM&month_b=YYYY-MM
     */
    public function compare(Request $request): JsonResponse
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        $request->validate([
            'month_a' => ['required', 'string'],
            'month_b' => ['required', 'string'],
        ]);

        $svc = new BalanceSheetService(auth()->id());
        $result = $svc->compareMonths(
            $request->query('month_a'),
            $request->query('month_b')
        );

        return response()->json($result);
    }

    /**
     * DELETE /api/v1/balance-sheet/{balanceSheetTotal}
     *
     * Removes a persisted snapshot, unlocking the month.
     */
    public function destroy(BalanceSheetTotal $balanceSheetTotal): JsonResponse
    {
        $this->authorize('delete', $balanceSheetTotal);

        $balanceSheetTotal->delete();

        return response()->json(null, 204);
    }
}
