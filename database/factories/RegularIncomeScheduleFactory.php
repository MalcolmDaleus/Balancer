<?php

namespace Database\Factories;

use App\Models\RegularIncomeSchedule;
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
}
