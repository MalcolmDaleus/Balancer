<?php

namespace Database\Factories;

use App\Models\RecurringPaymentCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RecurringPaymentStreamFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'                       => User::factory(),
            'recurring_payment_category_id' => RecurringPaymentCategory::factory(),
            'name'                          => fake()->words(2, true),
            'description'                   => fake()->optional()->sentence(),
        ];
    }
}
