<?php

namespace App\Policies;

use App\Models\BalanceSheetTotal;
use App\Models\User;

class BalanceSheetTotalPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BalanceSheetTotal $total): bool
    {
        return $user->id === $total->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, BalanceSheetTotal $total): bool
    {
        return $user->id === $total->user_id;
    }
}
