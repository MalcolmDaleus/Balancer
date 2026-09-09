<?php

namespace App\Policies;

use App\Models\BudgetPlan;
use App\Models\User;

class BudgetPlanPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BudgetPlan $plan): bool
    {
        return $user->id === $plan->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, BudgetPlan $plan): bool
    {
        return $user->id === $plan->user_id;
    }

    public function delete(User $user, BudgetPlan $plan): bool
    {
        return $user->id === $plan->user_id;
    }

    public function deleteAny(User $user): bool
    {
        return true;
    }
}
