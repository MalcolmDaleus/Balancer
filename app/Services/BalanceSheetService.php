<?php

namespace App\Services;

use App\Models\BalanceSheetTotal;
use App\Services\BalanceSheet\ExpandedPresenter;
use App\Services\BalanceSheet\PeriodContext;
use App\Services\BalanceSheet\PeriodFactRepository;
use App\Services\BalanceSheet\RecurringSection;
use App\Services\BalanceSheet\SnapshotService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Thin facade over the BalanceSheet domain services.
 *
 * Public API (ctor, getSimplified, getExpanded, compareMonths, persistSnapshot,
 * getHistory) and readonly period fields are preserved for callers.
 */
class BalanceSheetService
{
    public readonly int $userId;

    public readonly Carbon $month;

    public readonly Carbon $periodStart;

    public readonly Carbon $periodEnd;

    private readonly PeriodContext $ctx;

    private readonly PeriodFactRepository $facts;

    private readonly RecurringSection $recurring;

    private readonly ExpandedPresenter $expanded;

    private readonly SnapshotService $snapshots;

    /**
     * @param  int  $userId
     * @param  string|Carbon|null  $month  null means current month
     */
    public function __construct(int $userId, Carbon|string|null $month = null)
    {
        $this->ctx = new PeriodContext($userId, $month);
        $this->facts = new PeriodFactRepository($this->ctx);
        $this->recurring = new RecurringSection($this->ctx, $this->facts);
        $this->expanded = new ExpandedPresenter($this->ctx, $this->facts, $this->recurring);
        $this->snapshots = new SnapshotService($this->ctx, $this->facts);

        $this->userId = $this->ctx->userId;
        $this->month = $this->ctx->month;
        $this->periodStart = $this->ctx->periodStart;
        $this->periodEnd = $this->ctx->periodEnd;
    }

    public function getSimplified(): array
    {
        return $this->snapshots->simplified();
    }

    public function getExpanded(): array
    {
        return $this->expanded->present();
    }

    public function compareMonths(string|Carbon $monthA, string|Carbon $monthB): array
    {
        return $this->snapshots->compare($monthA, $monthB);
    }

    public function persistSnapshot(array|null $simplified = null): BalanceSheetTotal
    {
        return $this->snapshots->persist($simplified);
    }

    public function getHistory(int $months = 12): Collection
    {
        return $this->snapshots->history($months);
    }
}
