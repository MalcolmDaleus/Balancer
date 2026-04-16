<?php

namespace Database\Factories;

use App\Models\IncomeCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncomeStreamFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'category_id' => IncomeCategory::factory(),
            'name'        => fake()->words(2, true),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
