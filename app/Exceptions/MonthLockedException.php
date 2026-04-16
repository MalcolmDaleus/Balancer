<?php

namespace App\Exceptions;

use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

/**
 * Thrown when an attempt is made to write financial data for a month that
 * has already been closed (a BalanceSheetTotal row exists for it).
 *
 * Returns HTTP 423 Locked so clients can distinguish this from generic 422/403.
 */
class MonthLockedException extends HttpResponseException
{
    public function __construct(Carbon $month)
    {
        parent::__construct(
            new JsonResponse([
                'message' => 'The month ' . $month->format('F Y') . ' is locked and cannot be modified.',
                'month'   => $month->toDateString(),
                'error'   => 'month_locked',
            ], JsonResponse::HTTP_LOCKED) // 423
        );
    }
}
