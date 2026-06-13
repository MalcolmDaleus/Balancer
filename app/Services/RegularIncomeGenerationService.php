<?php

namespace App\Services;

use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RegularIncomeGenerationService
{
    public function __construct(
        private readonly OccurrenceCalculatorService $calculator,
    ) {}

    /**
     * Generate future regular income entries and flush pending toggles for a user.
     * Intended to run on every dashboard visit (idempotent).
     */
    public function generateForUser(int $userId, Carbon|string|null $asOf = null): void
    {
        $today = Carbon::parse($asOf ?? now())->startOfDay();
        $horizonEnd = $today->copy()->endOfMonth();

        $this->flushPendingToggles($userId, $today);

        $schedules = RegularIncomeSchedule::where('user_id', $userId)
            ->where('active', true)
            ->get();

        foreach ($schedules as $schedule) {
            $this->generateForSchedule($schedule, $today, $horizonEnd);
        }
    }

    private function generateForSchedule(RegularIncomeSchedule $schedule, Carbon $today, Carbon $horizonEnd): void
    {
        $versions = $schedule->versions()
            ->where('active', true)
            ->where('start_date', '<=', $horizonEnd->toDateString())
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $today->toDateString());
            })
            ->orderBy('start_date')
            ->get();

        foreach ($versions as $version) {
            $this->generateForVersion($schedule, $version, $today, $horizonEnd);
        }
    }

    private function generateForVersion(
        RegularIncomeSchedule $schedule,
        RegularIncomeScheduleVersion $version,
        Carbon $today,
        Carbon $horizonEnd,
    ): void {
        $occurrences = $this->calculator->datesInRange(
            $version->frequency,
            $version->start_date,
            $version->end_date,
            $today,
            $horizonEnd,
            $today,
            $version->day_of_month,
            $version->day_of_week,
            $version->anchor_date ?? $version->start_date,
        );

        foreach ($occurrences as $date) {
            if (! $version->isEffectiveOn($date)) {
                continue;
            }

            IncomeEntry::firstOrCreate(
                [
                    'regular_schedule_version_id' => $version->id,
                    'received_at'                 => $date->toDateString(),
                ],
                [
                    'user_id'             => $schedule->user_id,
                    'type'                => IncomeEntryType::Regular,
                    'name'                => $schedule->name,
                    'description'         => $schedule->description,
                    'amount'              => $version->amount,
                    'regular_schedule_id' => $schedule->id,
                ]
            );
        }
    }

    /**
     * Commit pending_active when today matches a scheduled occurrence.
     */
    public function flushPendingToggles(int $userId, Carbon|string|null $asOf = null): void
    {
        $today = Carbon::parse($asOf ?? now())->startOfDay();

        RegularIncomeSchedule::where('user_id', $userId)
            ->whereNotNull('pending_active')
            ->with(['versions' => fn ($q) => $q->where('active', true)->orderByDesc('start_date')])
            ->get()
            ->each(function (RegularIncomeSchedule $schedule) use ($today): void {
                $version = $schedule->versions->first();

                if (! $version) {
                    return;
                }

                $nextOccurrence = $this->calculator->nextOccurrenceOnOrAfter(
                    $version->frequency,
                    $version->start_date,
                    $version->end_date,
                    $today,
                    $version->day_of_month,
                    $version->day_of_week,
                    $version->anchor_date ?? $version->start_date,
                );

                if ($nextOccurrence === null || ! $nextOccurrence->isSameDay($today)) {
                    return;
                }

                DB::transaction(function () use ($schedule): void {
                    $schedule->update([
                        'active'         => $schedule->pending_active,
                        'pending_active' => null,
                    ]);
                });
            });
    }
}
