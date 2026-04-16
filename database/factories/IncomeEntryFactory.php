<?php

namespace Database\Factories;

use App\Models\IncomeEntry;
use App\Models\IncomeStream;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncomeEntryFactory extends Factory
{
    protected $model = IncomeEntry::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'income_stream_id' => IncomeStream::factory(),
            'amount'           => $this->faker->randomFloat(2, 100, 5000),
            'month'            => now()->startOfMonth(),
        ];
    }
}
