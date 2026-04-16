<?php

namespace App\Exceptions;

use Carbon\Carbon;
use RuntimeException;

/**
 * Thrown when an attempt is made to write financial data for a month that
 * has already been closed (a BalanceSheetTotal row exists for it).
 *
 * This is a plain domain exception. The HTTP 423 response mapping lives in
 * bootstrap/app.php so the exception can be thrown and caught cleanly at
 * any layer (models, services, tests) without going through the HTTP kernel.
 */
class MonthLockedException extends RuntimeException
{
    public readonly Carbon $month;

    public function __construct(Carbon $month)
    {
        $this->month = $month;

        parent::__construct(
            'The month ' . $month->format('F Y') . ' is locked and cannot be modified.'
        );
    }
}
