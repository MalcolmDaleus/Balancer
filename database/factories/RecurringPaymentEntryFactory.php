<?php

namespace Database\Factories;

use App\Models\RecurringPaymentStream;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RecurringPaymentEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'                      => User::factory(),
            'recurring_payment_stream_id'  => RecurringPaymentStream::factory(),
            'amount'                       => fake()->randomFloat(2, 5, 500),
            'frequency'                    => 'monthly',
            'day_of_month'                 => fake()->numberBetween(1, 28),
            'day_of_week'                  => null,
            'start_date'                   => now()->startOfMonth(),
            'end_date'                     => null,
            'active'                       => true,
        ];
    }

    public function weekly(): static
    {
        return $this->state([
            'frequency'    => 'weekly',
            'day_of_week'  => fake()->numberBetween(0, 6),
            'day_of_month' => null,
        ]);
    }

    public function yearly(): static
    {
        return $this->state([
            'frequency'    => 'yearly',
            'day_of_month' => fake()->numberBetween(1, 28),
            'day_of_week'  => null,
        ]);
    }

    public function inactive(): static
    {
        return $this->state([
            'active'   => false,
            'end_date' => now()->toDateString(),
        ]);
    }
}
