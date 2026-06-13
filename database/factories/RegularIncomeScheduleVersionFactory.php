<?php

namespace Database\Factories;

use App\Enums\IncomeScheduleFrequency;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RegularIncomeScheduleVersionFactory extends Factory
{
    protected $model = RegularIncomeScheduleVersion::class;

    public function definition(): array
    {
        return [
            'user_id'             => User::factory(),
            'regular_schedule_id' => RegularIncomeSchedule::factory(),
            'amount'              => $this->faker->randomFloat(2, 1000, 6000),
            'frequency'           => IncomeScheduleFrequency::Monthly,
            'day_of_month'        => 1,
            'day_of_week'         => null,
            'anchor_date'         => null,
            'start_date'          => now()->startOfMonth()->toDateString(),
            'end_date'            => null,
            'active'              => true,
        ];
    }
}
