<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Class DateTimeService
 *
 * Centralized helper for all date and time operations in UTC.
 * Handles normalization, formatting, period calculations, and comparisons.
 */
class DateTimeService
{
    private static function toUtc(Carbon|string|null $date = null): Carbon
    {
        return Carbon::parse($date ?? Carbon::now('UTC'), 'UTC')->setTimezone('UTC');
    }

    public static function normalizeDate(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfDay();
    }

    public static function normalizeMonth(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfMonth();
    }

    public static function dayStart(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfDay();
    }

    public static function dayEnd(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->endOfDay();
    }

    public static function weekStart(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfWeek();
    }

    public static function weekEnd(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->endOfWeek();
    }

    public static function monthStart(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfMonth();
    }

    public static function monthEnd(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->endOfMonth();
    }

    public static function yearStart(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->startOfYear();
    }

    public static function yearEnd(Carbon|string|null $date = null): Carbon
    {
        return self::toUtc($date)->endOfYear();
    }

    public static function year(Carbon|string|null $date = null): int
    {
        return self::toUtc($date)->year;
    }

    public static function monthNumber(Carbon|string|null $date = null): int
    {
        return self::toUtc($date)->month;
    }

    public static function monthName(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->format('F');
    }

    public static function shortMonthName(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->format('M');
    }

    public static function day(Carbon|string|null $date = null): int
    {
        return self::toUtc($date)->day;
    }

    public static function weekdayName(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->format('l');
    }

    public static function shortWeekdayName(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->format('D');
    }

    public static function weekNumber(Carbon|string|null $date = null): int
    {
        return self::toUtc($date)->weekOfYear;
    }

    public static function firstDayOfMonth(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->startOfMonth()->toDateString();
    }

    public static function monthYear(Carbon|string|null $date = null): string
    {
        return self::toUtc($date)->format('Y-m');
    }

    public static function today(): Carbon
    {
        return Carbon::now('UTC')->startOfDay();
    }

    public static function yesterday(): Carbon
    {
        return Carbon::yesterday('UTC')->startOfDay();
    }

    public static function tomorrow(): Carbon
    {
        return Carbon::tomorrow('UTC')->startOfDay();
    }

    public static function formatForUI(Carbon|string|null $date = null, string $type = 'date'): string
    {
        $carbon = self::toUtc($date);

        return match ($type) {
            'datetime' => $carbon->format('Y-m-d H:i'),
            'date' => $carbon->toDateString(),
            'month' => $carbon->format('F'),
            'monthAbbr' => $carbon->format('M'),
            'monthYear' => $carbon->format('F Y'),
            'monthDay' => $carbon->format('M j'),
            'monthDayYear' => $carbon->format('M j, Y'),
            'week' => 'Week ' . $carbon->weekOfYear . ', ' . $carbon->year,
            'year' => (string) $carbon->year,
            'full' => $carbon->format('l, F jS, Y'),
            'short' => $carbon->format('D, M j, Y'),
            'time' => $carbon->format('H:i'),
            'time12' => $carbon->format('g:i A'),
            'compact' => $carbon->format('Y-m-d H:i'),
            'weekdayShort' => $carbon->format('D'),
            'weekdayFull' => $carbon->format('l'),
            'relative' => $carbon->diffForHumans(),
            default => $carbon->toDateString(),
        };
    }

    public static function currentPeriod(string $period = 'month'): array
    {
        return match ($period) {
            'day' => [self::dayStart(), self::dayEnd()],
            'week' => [self::weekStart(), self::weekEnd()],
            'month' => [self::monthStart(), self::monthEnd()],
            'year' => [self::yearStart(), self::yearEnd()],
            default => [self::dayStart(), self::dayEnd()],
        };
    }

    public static function isBefore(Carbon|string $date, Carbon|string $compareTo): bool
    {
        return self::toUtc($date)->lessThan(self::toUtc($compareTo));
    }

    public static function isAfter(Carbon|string $date, Carbon|string $compareTo): bool
    {
        return self::toUtc($date)->greaterThan(self::toUtc($compareTo));
    }

    public static function isSameDay(Carbon|string $dateA, Carbon|string $dateB): bool
    {
        return self::toUtc($dateA)->isSameDay(self::toUtc($dateB));
    }

    public static function isBetween(
        Carbon|string $date,
        Carbon|string $start,
        Carbon|string $end,
        bool $inclusive = true
    ): bool {
        return self::toUtc($date)->between(
            self::toUtc($start),
            self::toUtc($end),
            $inclusive
        );
    }

    public static function isPast(Carbon|string $date): bool
    {
        return self::toUtc($date)->isBefore(Carbon::now('UTC'));
    }

    public static function isFuture(Carbon|string $date): bool
    {
        return self::toUtc($date)->isAfter(Carbon::now('UTC'));
    }

    public static function clamp(Carbon|string $date, Carbon|string $min, Carbon|string $max): Carbon
    {
        $d = self::toUtc($date);
        $min = self::toUtc($min);
        $max = self::toUtc($max);

        if ($d->lessThan($min)) {
            return $min;
        }

        if ($d->greaterThan($max)) {
            return $max;
        }

        return $d;
    }

    public static function max(Carbon|string $a, Carbon|string $b): Carbon
    {
        return self::toUtc($a)->greaterThan(self::toUtc($b))
            ? self::toUtc($a)
            : self::toUtc($b);
    }

    public static function min(Carbon|string $a, Carbon|string $b): Carbon
    {
        return self::toUtc($a)->lessThan(self::toUtc($b))
            ? self::toUtc($a)
            : self::toUtc($b);
    }
}
