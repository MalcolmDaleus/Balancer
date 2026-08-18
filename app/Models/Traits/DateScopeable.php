<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;
use App\Services\DateTimeService;
use Carbon\Carbon;

trait DateScopeable
{
    /**
     * Scope a query for a specific day, week, month, or year.
     *
     * @param Builder $query
     * @param string|Carbon $date
     * @param string $column
     * @param string $period ['day', 'week', 'month', 'year']
     * @return Builder
     */
    public function scopeForPeriod(Builder $query, Carbon|string $date, string $column = 'created_at', string $period = 'month'): Builder
    {
        switch ($period) {
            case 'day':
                $start = DateTimeService::dayStart($date);
                $end   = DateTimeService::dayEnd($date);
                break;
            case 'week':
                $start = DateTimeService::weekStart($date);
                $end   = DateTimeService::weekEnd($date);
                break;
            case 'month':
                $start = DateTimeService::monthStart($date);
                $end   = DateTimeService::monthEnd($date);
                break;
            case 'year':
                $start = DateTimeService::yearStart($date);
                $end   = DateTimeService::yearEnd($date);
                break;
            default:
                $start = DateTimeService::monthStart($date);
                $end   = DateTimeService::monthEnd($date);
                break;
        }

        return $query->whereBetween($column, [$start, $end]);
    }

    /**
     * Scope a query for the last X periods.
     *
     * @param Builder $query
     * @param int $count
     * @param string $column
     * @param string $period ['day', 'week', 'month', 'year']
     * @return Builder
     */
    public function scopeForLastPeriods(Builder $query, int $count, string $column = 'created_at', string $period = 'month'): Builder
    {
        $now = Carbon::now('UTC');

        switch ($period) {
            case 'day':
                $start = DateTimeService::dayStart($now->copy()->subDays($count));
                $end   = DateTimeService::dayEnd($now);
                break;
            case 'week':
                $start = DateTimeService::weekStart($now->copy()->subWeeks($count));
                $end   = DateTimeService::weekEnd($now);
                break;
            case 'month':
                $start = DateTimeService::monthStart($now->copy()->subMonths($count));
                $end   = DateTimeService::monthEnd($now);
                break;
            case 'year':
                $start = DateTimeService::yearStart($now->copy()->subYears($count));
                $end   = DateTimeService::yearEnd($now);
                break;
            default:
                $start = DateTimeService::monthStart($now->copy()->subMonths($count));
                $end   = DateTimeService::monthEnd($now);
                break;
        }

        return $query->whereBetween($column, [$start, $end]);
    }

    // ----------------------------------------------------------
    // COMMON PREDEFINED SCOPES
    // Kept for Statistics / long-range history queries (Wave product work).
    // Prefer these over ad-hoc date math when filtering Facts by lookback window.
    // ----------------------------------------------------------

    public function scopeForLast3Months(Builder $query, string $column = 'created_at'): Builder
    {
        return $this->scopeForLastPeriods($query, 3, $column, 'month');
    }

    public function scopeForLast6Months(Builder $query, string $column = 'created_at'): Builder
    {
        return $this->scopeForLastPeriods($query, 6, $column, 'month');
    }

    public function scopeForLastYear(Builder $query, string $column = 'created_at'): Builder
    {
        return $this->scopeForLastPeriods($query, 1, $column, 'year');
    }

    public function scopeForLast5Years(Builder $query, string $column = 'created_at'): Builder
    {
        return $this->scopeForLastPeriods($query, 5, $column, 'year');
    }
}