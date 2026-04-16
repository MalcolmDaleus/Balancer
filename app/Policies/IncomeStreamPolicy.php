<?php

namespace App\Policies;

use App\Models\IncomeStream;
use App\Models\User;

class IncomeStreamPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, IncomeStream $stream): bool
    {
        return $user->id === $stream->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, IncomeStream $stream): bool
    {
        return $user->id === $stream->user_id;
    }

    public function delete(User $user, IncomeStream $stream): bool
    {
        return $user->id === $stream->user_id;
    }
}
