<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Config;

class CurrencyService
{
    private static function getCurrencyArray(?User $user = null): array
    {
        if (!$user) {
            $user = Auth::user();
        }

        $code = $user->currency;
        $currencies = Config::get('currency', []);

        return $currencies[$code] ?? [];
    }

    public static function code(?User $user = null): string
    {
        $currency = self::getCurrencyArray($user);
        return $currency['code'] ?? '';
    }

    public static function singular(?User $user = null): string
    {
        $currency = self::getCurrencyArray($user);
        return $currency['singular'] ?? '';
    }

    public static function plural(?User $user = null): string
    {
        $currency = self::getCurrencyArray($user);
        return $currency['plural'] ?? '';
    }

    public static function symbol(?User $user = null): string
    {
        $currency = self::getCurrencyArray($user);
        return $currency['symbol'] ?? '';
    }
    
    public static function abbr(?User $user = null): string
    {
        $currency = self::getCurrencyArray($user);
        return $currency['abbr'] ?? '';
    }
}