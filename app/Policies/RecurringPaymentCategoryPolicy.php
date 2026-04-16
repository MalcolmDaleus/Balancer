<?php

namespace App\Policies;

use App\Models\RecurringPaymentCategory;
use App\Models\User;

class RecurringPaymentCategoryPolicy
{
    public function viewAny(User $user): bool   { return true; }
    public function view(User $user, RecurringPaymentCategory $cat): bool   { return $user->id === $cat->user_id; }
    public function create(User $user): bool    { return true; }
    public function update(User $user, RecurringPaymentCategory $cat): bool { return $user->id === $cat->user_id; }
    public function delete(User $user, RecurringPaymentCategory $cat): bool { return $user->id === $cat->user_id; }
    public function restore(User $user, RecurringPaymentCategory $cat): bool { return $user->id === $cat->user_id; }
}
