<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\LedgerFeedRequest;
use App\Services\DateTimeService;
use App\Services\FinancialFlowReadModel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class LedgerFeedController extends Controller
{
    public function __construct(
        private readonly FinancialFlowReadModel $facts,
    ) {}

    public function __invoke(LedgerFeedRequest $request): JsonResponse
    {
        $data = $request->validated();
        $from = isset($data['from'])
            ? DateTimeService::dayStart($data['from'])
            : Carbon::now('UTC')->startOfMonth();
        $to = isset($data['to'])
            ? DateTimeService::dayEnd($data['to'])
            : Carbon::now('UTC')->endOfMonth();

        $facts = $this->facts->forFeed((int) $request->user()->id, [
            'from' => $from,
            'to' => $to,
            'q' => $data['q'] ?? null,
            'domain' => $data['domain'] ?? null,
            'amount_min_cents' => isset($data['amount_min_cents']) ? (int) $data['amount_min_cents'] : null,
            'amount_max_cents' => isset($data['amount_max_cents']) ? (int) $data['amount_max_cents'] : null,
        ]);

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'facts' => $facts->all(),
        ]);
    }
}
