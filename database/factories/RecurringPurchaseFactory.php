<?php

namespace Database\Factories;

use App\Models\RecurringPurchase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RecurringPurchaseFactory extends Factory
{
    protected $model = RecurringPurchase::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'category_id'  => null,
            'amount'       => $this->faker->randomFloat(2, 5, 200),
            'description'  => $this->faker->words(3, true),
            'frequency'    => 'monthly',
            'day_of_month' => $this->faker->numberBetween(1, 28),
            'day_of_week'  => null,
            'start_date'   => now()->startOfMonth(),
            'end_date'     => null,
            'active'       => true,
        ];
    }
}
