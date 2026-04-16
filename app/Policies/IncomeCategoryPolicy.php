<?php

namespace App\Policies;

use App\Models\IncomeCategory;
use App\Models\User;

class IncomeCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, IncomeCategory $category): bool
    {
        return $user->id === $category->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, IncomeCategory $category): bool
    {
        return $user->id === $category->user_id;
    }

    public function delete(User $user, IncomeCategory $category): bool
    {
        return $user->id === $category->user_id;
    }
}
