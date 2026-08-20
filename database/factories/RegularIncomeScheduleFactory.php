<?php

namespace Database\Factories;

use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RegularIncomeScheduleFactory extends Factory
{
    protected $model = RegularIncomeSchedule::class;

    public function definition(): array
    {
        return [
            'user_id'        => User::factory(),
            'name'           => fake()->words(2, true),
            'description'    => fake()->optional()->sentence(),
            'active'         => true,
            'pending_active' => null,
        ];
    }

    /**
     * Opt-in: create an active version after the schedule (mirrors API store).
     * Default factory creates the schedule only — no automatic version.
     *
     * @param  array<string, mixed>  $overrides
     */
    public function withActiveVersion(array $overrides = []): static
    {
        return $this->afterCreating(function (RegularIncomeSchedule $schedule) use ($overrides) {
            RegularIncomeScheduleVersion::factory()->create(array_merge([
                'user_id'             => $schedule->user_id,
                'regular_schedule_id' => $schedule->id,
                'active'              => true,
            ], $overrides));
        });
    }
}
