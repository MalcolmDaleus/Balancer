<?php

namespace App\Policies;

use App\Models\RecurringPaymentEntry;
use App\Models\User;

class RecurringPaymentEntryPolicy
{
    public function viewAny(User $user): bool   { return true; }
    public function view(User $user, RecurringPaymentEntry $entry): bool   { return $user->id === $entry->user_id; }
    public function create(User $user): bool    { return true; }
    public function update(User $user, RecurringPaymentEntry $entry): bool { return $user->id === $entry->user_id; }
    public function delete(User $user, RecurringPaymentEntry $entry): bool { return $user->id === $entry->user_id; }
    public function restore(User $user, RecurringPaymentEntry $entry): bool { return $user->id === $entry->user_id; }
}
