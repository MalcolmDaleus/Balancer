<?php

namespace App\Policies;

use App\Models\BugReport;
use App\Models\User;

class BugReportPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, BugReport $bugReport): bool
    {
        return $user->isAdmin();
    }
}
