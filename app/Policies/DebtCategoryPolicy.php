<?php

namespace App\Policies;

use App\Models\DebtCategory;
use App\Models\User;

class DebtCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DebtCategory $category): bool
    {
        return $user->id === $category->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, DebtCategory $category): bool
    {
        return $user->id === $category->user_id;
    }

    public function delete(User $user, DebtCategory $category): bool
    {
        return $user->id === $category->user_id;
    }
}
