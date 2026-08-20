<?php

namespace App\Services\BalanceSheet;

use App\Services\DateTimeService;
use App\Services\MonthLockService;
use Carbon\Carbon;

/**
 * Shared period identity for one balance-sheet computation (user + month).
 */
final class PeriodContext
{
    public readonly int $userId;

    public readonly Carbon $month;

    public readonly Carbon $periodStart;

    public readonly Carbon $periodEnd;

    private ?bool $locked = null;

    public function __construct(int $userId, Carbon|string|null $month = null)
    {
        $this->userId = $userId;
        $this->month = DateTimeService::normalizeMonth($month);
        $this->periodStart = DateTimeService::monthStart($this->month);
        $this->periodEnd = DateTimeService::monthEnd($this->month);
    }

    /** Memoized MonthLockService::isLocked for this period instance. */
    public function isLocked(): bool
    {
        return $this->locked ??= MonthLockService::isLocked($this->userId, $this->month);
    }
}
