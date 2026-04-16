<?php

namespace App\Policies;

use App\Models\RecurringPaymentStream;
use App\Models\User;

class RecurringPaymentStreamPolicy
{
    public function viewAny(User $user): bool   { return true; }
    public function view(User $user, RecurringPaymentStream $stream): bool   { return $user->id === $stream->user_id; }
    public function create(User $user): bool    { return true; }
    public function update(User $user, RecurringPaymentStream $stream): bool { return $user->id === $stream->user_id; }
    public function delete(User $user, RecurringPaymentStream $stream): bool { return $user->id === $stream->user_id; }
    public function restore(User $user, RecurringPaymentStream $stream): bool { return $user->id === $stream->user_id; }
}
