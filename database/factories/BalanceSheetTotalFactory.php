<?php

namespace Database\Factories;

use App\Models\BalanceSheetTotal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BalanceSheetTotalFactory extends Factory
{
    protected $model = BalanceSheetTotal::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'month'            => now()->subMonths($this->faker->unique()->numberBetween(1, 60))->startOfMonth()->toDateString(),
            'total_income'     => $this->faker->randomFloat(2, 0, 5000),
            'total_debt_paid'  => $this->faker->randomFloat(2, 0, 500),
            'total_spending'   => $this->faker->randomFloat(2, 0, 2000),
            'total_recurring'  => $this->faker->randomFloat(2, 0, 1000),
            'savings_snapshot' => $this->faker->randomFloat(2, 0, 500),
            'roll_over'        => $this->faker->randomFloat(2, -500, 3000),
        ];
    }
}
