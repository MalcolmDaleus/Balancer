<?php

namespace App\Policies;

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\User;

class DebtPaymentPolicy
{
    public function viewAny(User $user, Debt $debt): bool
    {
        return $user->id === $debt->user_id;
    }

    public function view(User $user, DebtPayment $payment): bool
    {
        return $user->id === $payment->user_id;
    }

    public function create(User $user, Debt $debt): bool
    {
        return $user->id === $debt->user_id;
    }

    public function update(User $user, DebtPayment $payment): bool
    {
        return $user->id === $payment->user_id;
    }

    public function delete(User $user, DebtPayment $payment): bool
    {
        return $user->id === $payment->user_id;
    }
}
