<?php

namespace App\Http\Controllers;

use App\Services\FinanceProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Explicit catch-up endpoint. Prefer cron (`finance:process-due` /
 * `finance:close-months`) in production; this exists for manual sync and
 * pre-host dashboard safety nets.
 */
class FinanceSyncController extends Controller
{
    public function __invoke(Request $request, FinanceProcessingService $finance): JsonResponse
    {
        $result = $finance->syncUser($request->user()->id);

        return response()->json([
            'closed_months' => $result['closed_months'],
            'skipped'       => $result['skipped'],
        ]);
    }
}
