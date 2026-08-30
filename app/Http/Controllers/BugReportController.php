<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreBugReportRequest;
use App\Http\Resources\BugReportResource;
use App\Models\BugReport;
use Illuminate\Http\JsonResponse;

class BugReportController extends Controller
{
    public function store(StoreBugReportRequest $request): JsonResponse
    {
        $this->authorize('create', BugReport::class);

        $report = BugReport::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return (new BugReportResource($report))
            ->response()
            ->setStatusCode(201);
    }
}
