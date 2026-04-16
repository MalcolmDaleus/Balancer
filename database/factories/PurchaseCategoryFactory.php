<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseCategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'       => User::factory(),
            'category_name' => fake()->unique()->word(),
        ];
    }
}
