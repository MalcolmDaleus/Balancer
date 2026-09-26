<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\User;
use Carbon\Carbon;

/**
 * Super-month stance: wallet stocks, open debt, remaining bills, and how long records go back.
 */
class StandingService
{
    public function __construct(
        private readonly LiquidityService $liquidity,
    ) {}

    /**
     * @return array{
     *   available_cash_cents: int,
     *   savings_total_cents: int,
     *   owed_cents: int,
     *   upcoming_cents: int,
     *   upcoming: list<array{name: string, date: string, amount_cents: int, stream_id: int|null, category_id: int|null, category_name: string|null}>,
     *   tracking_since: string,
     *   months_tracked: int
     * }
     */
    public function forUser(int $userId): array
    {
        $user = User::query()->findOrFail($userId);
        $wallet = $this->liquidity->forUser($userId);
        $since = $this->trackingSince($user);
        $openMonth = DateTimeService::normalizeMonth();
        app(RecurringPaymentMaterializationService::class)->pruneFutureOpenMonthCharges($userId);
        $upcoming = (new BalanceSheetService($userId, $openMonth))->upcomingRecurringCharges();

        return [
            ...$wallet,
            'owed_cents' => $this->owedCents($userId),
            'upcoming_cents' => MoneyService::sum(array_column($upcoming, 'amount_cents')),
            'upcoming' => $upcoming,
            'tracking_since' => $since->format('Y-m'),
            'months_tracked' => (int) $since->diffInMonths($openMonth) + 1,
        ];
    }

    private function trackingSince(User $user): Carbon
    {
        $raw = $user->onboarded_at ?? $user->created_at;

        return DateTimeService::normalizeMonth($raw);
    }

    private function owedCents(int $userId): int
    {
        $debts = Debt::query()
            ->where('user_id', $userId)
            ->where('is_forgiven', false)
            ->with('payments')
            ->get();

        return (int) $debts
            ->filter(fn (Debt $debt) => $debt->remaining_cents > 0)
            ->sum(fn (Debt $debt) => $debt->remaining_cents);
    }
}
