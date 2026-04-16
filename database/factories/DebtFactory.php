<?php

namespace Database\Factories;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DebtFactory extends Factory
{
    protected $model = Debt::class;

    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'category_id' => null,
            'amount'      => $this->faker->randomFloat(2, 100, 5000),
            'description' => $this->faker->sentence(4),
            'issue_date'  => $this->faker->dateTimeThisYear(),
            'settle_date' => null,
            'notes'       => null,
        ];
    }
}
