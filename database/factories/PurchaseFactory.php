<?php

namespace Database\Factories;

use App\Models\Purchase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseFactory extends Factory
{
    protected $model = Purchase::class;

    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'category_id' => \App\Models\PurchaseCategory::factory(),
            'amount'      => $this->faker->randomFloat(2, 1, 500),
            'description' => $this->faker->words(3, true),
            'date'        => $this->faker->dateTimeThisMonth(),
            'is_refunded' => false,
        ];
    }
}
