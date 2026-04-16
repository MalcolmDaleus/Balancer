<?php

namespace App\Policies;

use App\Models\RecurringPurchase;
use App\Models\User;

class RecurringPurchasePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RecurringPurchase $rp): bool
    {
        return $user->id === $rp->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RecurringPurchase $rp): bool
    {
        return $user->id === $rp->user_id;
    }

    public function delete(User $user, RecurringPurchase $rp): bool
    {
        return $user->id === $rp->user_id;
    }
}
