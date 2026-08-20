<?php

namespace Database\Factories;

use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
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
            'active'                        => true,
            'pending_active'                => null,
        ];
    }

    /**
     * Opt-in: create an active entry after the stream (mirrors API store).
     * Default factory creates the stream only — no automatic entry.
     *
     * @param  array<string, mixed>  $overrides
     */
    public function withActiveEntry(array $overrides = []): static
    {
        return $this->afterCreating(function (RecurringPaymentStream $stream) use ($overrides) {
            RecurringPaymentEntry::factory()->create(array_merge([
                'user_id'                     => $stream->user_id,
                'recurring_payment_stream_id' => $stream->id,
                'active'                      => true,
            ], $overrides));
        });
    }
}
