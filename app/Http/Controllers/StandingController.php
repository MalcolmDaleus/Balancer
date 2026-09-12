<?php

namespace App\Http\Controllers;

use App\Models\BalanceSheetTotal;
use App\Services\StandingService;
use Illuminate\Http\JsonResponse;

class StandingController extends Controller
{
    public function show(StandingService $standing): JsonResponse
    {
        $this->authorize('viewAny', BalanceSheetTotal::class);

        return response()->json($standing->forUser((int) request()->user()->id));
    }
}
