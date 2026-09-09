<?php

namespace Database\Factories;

use App\Models\BudgetPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetPlan>
 */
class BudgetPlanFactory extends Factory
{
    protected $model = BudgetPlan::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'month' => now()->startOfMonth()->toDateString(),
            'discretionary_cents' => 100000,
            'bills_cents' => null,
            'debt_payment_cents' => null,
            'save_cents' => null,
            'copied_from_month' => null,
        ];
    }
}
