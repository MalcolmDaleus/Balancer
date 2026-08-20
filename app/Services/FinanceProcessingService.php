<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates due-date financial processing and month close.
 *
 * Cron is the primary trigger; optional API/CLI sync (`finance:sync`) for explicit catch-up.
 * All entry points share the same idempotent per-user pipeline and lock.
 */
class FinanceProcessingService
{
    private const LOCK_SECONDS = 120;

    public function __construct(
        private readonly RegularIncomeGenerationService $incomeGeneration,
        private readonly RecurringPaymentMaterializationService $recurringMaterialization,
        private readonly RecurringPaymentCycleService $recurringCycle,
        private readonly AutoMonthCloseService $monthClose,
    ) {}

    /**
     * Generate due income, flush pending toggles (income + recurring).
     *
     * @return bool True when work ran; false when skipped (lock held by another process).
     */
    public function processDueForUser(int $userId, Carbon|string|null $asOf = null): bool
    {
        $ran = $this->withUserLock($userId, function () use ($userId, $asOf): true {
            $this->runProcessDue($userId, $asOf);
            $this->markProcessed($userId);

            return true;
        });

        return $ran === true;
    }

    /**
     * Close all complete unlocked months for a user.
     *
     * @return list<string>|null Closed YYYY-MM keys, or null if lock was not acquired.
     */
    public function closeMonthsForUser(int $userId, Carbon|string|null $asOf = null): ?array
    {
        return $this->withUserLock($userId, function () use ($userId, $asOf): array {
            $closed = $this->monthClose->closePendingMonths($userId, $asOf);
            $this->markProcessed($userId);

            return $closed;
        });
    }

    /**
     * Full catch-up: process due work then close months (single lock).
     *
     * @return array{closed_months: list<string>, skipped: bool}
     */
    public function syncUser(int $userId, Carbon|string|null $asOf = null): array
    {
        $result = $this->withUserLock($userId, function () use ($userId, $asOf): array {
            $this->runProcessDue($userId, $asOf);
            $closed = $this->monthClose->closePendingMonths($userId, $asOf);
            $this->markProcessed($userId);

            return [
                'closed_months' => $closed,
                'skipped'       => false,
            ];
        });

        return $result ?? [
            'closed_months' => [],
            'skipped'       => true,
        ];
    }

    /**
     * @return int Number of users for which process-due ran (lock acquired).
     */
    public function processDueForAllUsers(Carbon|string|null $asOf = null): int
    {
        $ran = 0;

        User::query()->orderBy('id')->chunkById(100, function ($users) use ($asOf, &$ran): void {
            foreach ($users as $user) {
                if ($this->processDueForUser($user->id, $asOf)) {
                    $ran++;
                }
            }
        });

        return $ran;
    }

    /**
     * @return int Number of users for which close-months ran (lock acquired).
     */
    public function closeMonthsForAllUsers(Carbon|string|null $asOf = null): int
    {
        $ran = 0;

        User::query()->orderBy('id')->chunkById(100, function ($users) use ($asOf, &$ran): void {
            foreach ($users as $user) {
                if ($this->closeMonthsForUser($user->id, $asOf) !== null) {
                    $ran++;
                }
            }
        });

        return $ran;
    }

    private function runProcessDue(int $userId, Carbon|string|null $asOf = null): void
    {
        $this->incomeGeneration->generateForUser($userId, $asOf);

        // Charge then pause: materialize while stream is still active, then flush toggles.
        $this->recurringMaterialization->materializeForUser($userId, $asOf);
        $this->recurringCycle->processForUser($userId, $asOf);
    }

    private function markProcessed(int $userId): void
    {
        User::where('id', $userId)->update([
            'last_finance_processed_at' => now(),
        ]);
    }

    /**
     * @template T
     * @param  callable(): T  $callback
     * @return T|null
     */
    private function withUserLock(int $userId, callable $callback): mixed
    {
        $key = "finance:user:{$userId}";
        $store = Cache::getStore();

        if ($store instanceof LockProvider) {
            $lock = $store->lock($key, self::LOCK_SECONDS);

            if (! $lock->get()) {
                Log::info('Finance processing skipped; lock held', ['user_id' => $userId]);

                return null;
            }

            try {
                return $callback();
            } finally {
                $lock->release();
            }
        }

        // Array / other non-locking stores (e.g. phpunit CACHE_STORE=array).
        if (! Cache::add($key, 1, self::LOCK_SECONDS)) {
            Log::info('Finance processing skipped; soft lock held', ['user_id' => $userId]);

            return null;
        }

        try {
            return $callback();
        } finally {
            Cache::forget($key);
        }
    }
}
