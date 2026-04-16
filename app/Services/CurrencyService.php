<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Config;

/**
 * Resolves currency metadata from config/currency.php for a given User.
 *
 * All methods require an explicit User — there is no Auth::user() fallback.
 * This makes the service safe to call from CLI commands, queue jobs, and
 * tests without a logged-in session.
 */
class CurrencyService
{
    private static function getCurrencyArray(User $user): array
    {
        $currencies = Config::get('currency', []);
        return $currencies[$user->currency] ?? [];
    }

    public static function code(User $user): string
    {
        return self::getCurrencyArray($user)['code'] ?? '';
    }

    public static function singular(User $user): string
    {
        return self::getCurrencyArray($user)['singular'] ?? '';
    }

    public static function plural(User $user): string
    {
        return self::getCurrencyArray($user)['plural'] ?? '';
    }

    public static function symbol(User $user): string
    {
        return self::getCurrencyArray($user)['symbol'] ?? '';
    }

    public static function abbr(User $user): string
    {
        return self::getCurrencyArray($user)['abbr'] ?? '';
    }
}