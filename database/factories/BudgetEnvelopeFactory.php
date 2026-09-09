<?php

namespace Database\Factories;

use App\Enums\BudgetEnvelopeDomain;
use App\Models\BudgetEnvelope;
use App\Models\BudgetPlan;
use App\Models\PurchaseCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetEnvelope>
 */
class BudgetEnvelopeFactory extends Factory
{
    protected $model = BudgetEnvelope::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'budget_plan_id' => BudgetPlan::factory(),
            'domain' => BudgetEnvelopeDomain::Purchase,
            'category_id' => PurchaseCategory::factory(),
            'amount_cents' => 20000,
        ];
    }
}
