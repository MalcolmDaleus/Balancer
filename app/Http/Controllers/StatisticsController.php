<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StatisticsMarkersRequest;
use App\Http\Requests\Api\StatisticsSeriesRequest;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;

class StatisticsController extends Controller
{
    public function __construct(
        private readonly StatisticsService $statistics,
    ) {}

    public function series(StatisticsSeriesRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->statistics->series(
                (int) $request->user()->id,
                $data['view'],
                $data['series'],
                (int) ($data['window'] ?? 6),
            )
        );
    }

    public function markers(StatisticsMarkersRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json(
            $this->statistics->markers(
                (int) $request->user()->id,
                (int) ($data['window'] ?? 6),
            )
        );
    }
}
