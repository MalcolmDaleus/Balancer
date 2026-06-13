<?php

namespace Database\Factories;

use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\RegularIncomeSchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncomeEntryFactory extends Factory
{
    protected $model = IncomeEntry::class;

    public function definition(): array
    {
        return [
            'user_id'                     => User::factory(),
            'type'                        => IncomeEntryType::Irregular,
            'name'                        => fake()->words(2, true),
            'description'                 => fake()->optional()->sentence(),
            'received_at'                 => now()->startOfMonth()->toDateString(),
            'amount'                      => $this->faker->randomFloat(2, 100, 5000),
            'purchase_id'                 => null,
            'regular_schedule_id'         => null,
            'regular_schedule_version_id' => null,
        ];
    }

    public function regular(): static
    {
        return $this->state(fn () => [
            'type' => IncomeEntryType::Regular,
            'regular_schedule_id' => RegularIncomeSchedule::factory(),
        ]);
    }

    public function refund(): static
    {
        return $this->state(fn () => [
            'type' => IncomeEntryType::Refund,
            'name' => 'Refund: ' . fake()->words(3, true),
        ]);
    }
}
