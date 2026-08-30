<?php

namespace App\Policies;

use App\Models\User;

class BugReportPolicy
{
    public function create(User $user): bool
    {
        return true;
    }
}
