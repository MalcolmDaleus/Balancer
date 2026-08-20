<?php

namespace App\Http\Controllers;

use App\Services\FinanceProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Optional explicit catch-up. Prefer cron (`finance:process-due` /
 * `finance:close-months`) in production; this is for manual/API sync.
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
