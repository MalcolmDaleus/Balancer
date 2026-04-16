<?php

namespace App\Policies;

use App\Models\IncomeEntry;
use App\Models\User;

class IncomeEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, IncomeEntry $entry): bool
    {
        return $user->id === $entry->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, IncomeEntry $entry): bool
    {
        return $user->id === $entry->user_id;
    }

    public function delete(User $user, IncomeEntry $entry): bool
    {
        return $user->id === $entry->user_id;
    }
}
