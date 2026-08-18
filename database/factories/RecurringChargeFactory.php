<?php

namespace Database\Factories;

use App\Models\RecurringCharge;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RecurringCharge>
 */
class RecurringChargeFactory extends Factory
{
    protected $model = RecurringCharge::class;

    public function definition(): array
    {
        return [
            'user_id'                       => User::factory(),
            'recurring_payment_entry_id'    => RecurringPaymentEntry::factory(),
            'recurring_payment_stream_id'   => RecurringPaymentStream::factory(),
            'recurring_payment_category_id' => null,
            'stream_name'                   => fake()->words(2, true),
            'category_name'                 => null,
            'amount'                        => fake()->randomFloat(2, 5, 500),
            'occurred_on'                   => fake()->date(),
        ];
    }
}
