<?php

namespace App\Console\Commands;

use App\Models\Purchase;
use App\Models\RecurringPurchase;
use App\Services\DateTimeService;
use App\Services\MonthLockService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Artisan command: purchases:generate-recurring
 *
 * Iterates all active recurring purchase definitions and creates a Purchase
 * row for any definition that is due on the target date and has not yet had
 * a purchase generated for the current period.
 *
 * Idempotency: safe to run multiple times on the same day — the existence
 * check in alreadyGeneratedForPeriod() prevents duplicate rows.
 *
 * Month-lock awareness: definitions for a locked month are skipped and
 * reported in the output so the operator can investigate.
 */
class GenerateRecurringPurchases extends Command
{
    protected $signature = 'purchases:generate-recurring
                            {--date= : Target date in YYYY-MM-DD format (defaults to today)}
                            {--dry-run : Preview what would be created without writing to the DB}';

    protected $description = 'Generate purchases from active recurring purchase definitions';

    public function handle(): int
    {
        $targetDate = $this->option('date')
            ? DateTimeService::normalizeDate($this->option('date'))
            : DateTimeService::today();

        $dryRun = (bool) $this->option('dry-run');

        $this->info(sprintf(
            '[%s] Generating recurring purchases for %s%s',
            now()->toTimeString(),
            $targetDate->toDateString(),
            $dryRun ? ' (dry-run)' : ''
        ));

        $definitions = RecurringPurchase::activeOn($targetDate)
            ->with('category')
            ->get();

        if ($definitions->isEmpty()) {
            $this->line('No active recurring definitions found.');
            return self::SUCCESS;
        }

        $created = 0;
        $skipped = 0;

        foreach ($definitions as $rp) {
            if (! $this->isDueOn($rp, $targetDate)) {
                continue;
            }

            if (MonthLockService::isLocked($rp->user_id, $targetDate)) {
                $this->warn(sprintf(
                    '  SKIP (locked) [user:%d] "%s"',
                    $rp->user_id,
                    $rp->description
                ));
                $skipped++;
                continue;
            }

            if ($this->alreadyGeneratedForPeriod($rp, $targetDate)) {
                $this->line(sprintf(
                    '  SKIP (exists) [user:%d] "%s"',
                    $rp->user_id,
                    $rp->description
                ));
                $skipped++;
                continue;
            }

            if (! $dryRun) {
                Purchase::create([
                    'user_id'               => $rp->user_id,
                    'category_id'           => $rp->category_id,
                    'amount'                => $rp->amount,
                    'description'           => $rp->description,
                    'date'                  => $targetDate,
                    'recurring_purchase_id' => $rp->id,
                ]);
            }

            $this->info(sprintf(
                '  %s [user:%d] "%s" — %s',
                $dryRun ? 'WOULD CREATE' : 'CREATED',
                $rp->user_id,
                $rp->description,
                $rp->amount
            ));
            $created++;
        }

        $this->info(sprintf(
            'Done. %s: %d  |  Skipped: %d',
            $dryRun ? 'Would create' : 'Created',
            $created,
            $skipped
        ));

        return self::SUCCESS;
    }

    // ----------------------------------------------------------
    // Scheduling Logic
    // ----------------------------------------------------------

    /**
     * Determine if the recurring definition should fire on the given date.
     *
     * - weekly:  fires when today's day-of-week matches day_of_week
     * - monthly: fires when today's day-of-month matches day_of_month
     *            (clamped to last day of month for short months)
     * - yearly:  fires when today matches the month + day_of_month from start_date
     */
    private function isDueOn(RecurringPurchase $rp, Carbon $date): bool
    {
        return match ($rp->frequency) {
            'weekly'  => $date->dayOfWeek === (int) $rp->day_of_week,
            'monthly' => $date->day === $this->clampedDayOfMonth($rp, $date),
            'yearly'  => $date->month === $rp->start_date->month
                         && $date->day === $this->clampedDayOfMonth($rp, $date),
            default   => false,
        };
    }

    /**
     * Returns the scheduled day of month clamped to the actual number of days
     * in the given month (e.g. day 31 in February → 28/29).
     */
    private function clampedDayOfMonth(RecurringPurchase $rp, Carbon $date): int
    {
        return min((int) $rp->day_of_month, $date->daysInMonth);
    }

    /**
     * Check whether a purchase was already generated for this definition in
     * the current period so the command stays idempotent across multiple runs.
     *
     * Period window per frequency:
     * - weekly:  current week (Mon–Sun)
     * - monthly: current calendar month
     * - yearly:  current calendar year
     */
    private function alreadyGeneratedForPeriod(RecurringPurchase $rp, Carbon $date): bool
    {
        [$start, $end] = match ($rp->frequency) {
            'weekly'  => [DateTimeService::weekStart($date),  DateTimeService::weekEnd($date)],
            'yearly'  => [DateTimeService::yearStart($date),  DateTimeService::yearEnd($date)],
            default   => [DateTimeService::monthStart($date), DateTimeService::monthEnd($date)],
        };

        return Purchase::where('recurring_purchase_id', $rp->id)
            ->where('user_id', $rp->user_id)
            ->whereBetween('date', [$start, $end])
            ->exists();
    }
}
