<?php

namespace Database\Factories;

use App\Models\Saving;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SavingFactory extends Factory
{
    protected $model = Saving::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'amount'  => $this->faker->randomFloat(2, 10, 1000),
            'month'   => now()->startOfMonth(),
        ];
    }
}
