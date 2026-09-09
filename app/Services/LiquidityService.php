<?php

namespace App\Services;

use App\Models\BalanceSheetTotal;
use App\Models\Saving;
use App\Models\User;
use App\Support\MoneyCents;

/**
 * Derived wallet: onboarding seeds plus later monthly nets. Not a Fact.
 */
class LiquidityService
{
    /**
     * @return array{available_cash_cents: int, savings_total_cents: int}
     */
    public function forUser(int $userId): array
    {
        $user = User::query()->findOrFail($userId);
        $openMonth = DateTimeService::normalizeMonth();

        $closed = 0;
        if ($user->liquidity_seed_on !== null) {
            $cutoff = DateTimeService::normalizeMonth($user->liquidity_seed_on);
            $closed = MoneyCents::sumMajors(
                BalanceSheetTotal::query()
                    ->where('user_id', $userId)
                    ->whereDate('month', '>=', $cutoff->toDateString())
                    ->whereDate('month', '<', $openMonth->toDateString())
                    ->pluck('roll_over')
            );
        }

        $live = (int) ((new BalanceSheetService($userId, $openMonth))->getSimplified()['roll_over_cents'] ?? 0);

        return [
            'available_cash_cents' => (int) $user->liquidity_seed + $closed + $live,
            'savings_total_cents' => (int) $user->savings_seed + Saving::runningBalance($userId),
        ];
    }
}
