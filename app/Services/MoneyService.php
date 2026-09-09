<?php

namespace App\Services;

use App\Models\User;

class MoneyService
{
    /**
     * Format an amount using the currency name (singular/plural).
     * Requires an explicit User — there is no Auth fallback.
     */
    public static function formatWithName(float $amount, User $user): string
    {
        $name = ($amount == 1) ? CurrencyService::singular($user) : CurrencyService::plural($user);

        return number_format($amount, 2, '.', ',').' '.$name;
    }

    /**
     * Format an amount using the ISO abbreviation (e.g. "1,234.56 USD").
     * Requires an explicit User — there is no Auth fallback.
     */
    public static function formatWithAbbr(float $amount, User $user): string
    {
        return number_format($amount, 2, '.', ',').' '.CurrencyService::abbr($user);
    }

    /**
     * Format an amount using the currency symbol (e.g. "$1,234.56").
     * Requires an explicit User — there is no Auth fallback.
     */
    public static function formatWithSymbol(float $amount, User $user, bool $prefix = true): string
    {
        if ($prefix) {
            return CurrencyService::symbol($user).number_format($amount, 2, '.', ',');
        }

        return number_format($amount, 2, '.', ',').CurrencyService::symbol($user);
    }

    /**
     * Format an amount with a leading +/- sign.
     * Requires an explicit User — there is no Auth fallback.
     */
    public static function formatWithSign(float $amount, User $user, string $unit = 'symbol', bool $prefix = true): string
    {
        $sign = $amount >= 0 ? '+' : '-';
        $abs = self::absolute($amount);

        return match ($unit) {
            'abbr' => $sign.self::formatWithAbbr($abs, $user),
            'name' => $sign.self::formatWithName($abs, $user),
            default => $sign.self::formatWithSymbol($abs, $user, $prefix),
        };
    }

    public static function percentOf(float $amount, float $total): float
    {
        if ($total == 0) {
            return 0.0;
        }

        return round(($amount / $total) * 100, 2);
    }

    public static function applyPercent(float $amount, float $percent): float
    {
        return round($amount + ($amount * $percent / 100), 2);
    }

    public static function negate(float $amount): float
    {
        return -$amount;
    }

    public static function absolute(float $amount): float
    {
        return abs($amount);
    }

    public static function add(int $a, int $b): int
    {
        return $a + $b;
    }

    public static function subtract(int $a, int $b): int
    {
        return $a - $b;
    }

    public static function multiply(float $a, float $b): float
    {
        return round($a * $b, 2);
    }

    public static function divide(float $a, float $b): float
    {
        if ($b == 0) {
            return 0.0;
        }

        return round($a / $b, 2);
    }

    public static function isPositive(float $amount): bool
    {
        return $amount > 0;
    }

    public static function isNegative(float $amount): bool
    {
        return $amount < 0;
    }

    public static function isZero(float $amount): bool
    {
        return abs($amount) < PHP_FLOAT_EPSILON;
    }

    public static function sum(array $amounts): int
    {
        $total = 0;
        foreach ($amounts as $amount) {
            $total += (int) $amount;
        }

        return $total;
    }

    public static function average(array $amounts): float
    {
        return count($amounts) > 0 ? round(array_sum($amounts) / count($amounts), 2) : 0.0;
    }

    public static function max(array $amounts): float
    {
        return count($amounts) ? round(max($amounts), 2) : 0.0;
    }

    public static function min(array $amounts): float
    {
        return count($amounts) ? round(min($amounts), 2) : 0.0;
    }

    public static function contributionPercent(float $amount, float $total): float
    {
        if ($total == 0) {
            return 0.0;
        }

        return round(($amount / $total) * 100, 2);
    }

    public static function deltaPercent(float $current, float $previous): float
    {
        if (abs($previous) < PHP_FLOAT_EPSILON) {
            return abs($current) < PHP_FLOAT_EPSILON ? 0.0 : 100.0;
        }

        return round((($current - $previous) / $previous) * 100, 2);
    }
}
