<?php

namespace App\Policies;

use App\Models\Saving;
use App\Models\User;

class SavingPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Saving $saving): bool
    {
        return $user->id === $saving->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Saving $saving): bool
    {
        return $user->id === $saving->user_id;
    }

    public function delete(User $user, Saving $saving): bool
    {
        return $user->id === $saving->user_id;
    }
}
