<?php

namespace App\Policies;

use App\Models\RecurringCharge;
use App\Models\User;

class RecurringChargePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RecurringCharge $recurringCharge): bool
    {
        return $user->id === $recurringCharge->user_id;
    }

    public function delete(User $user, RecurringCharge $recurringCharge): bool
    {
        return $user->id === $recurringCharge->user_id;
    }
}
