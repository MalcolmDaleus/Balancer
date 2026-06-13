<?php

namespace App\Policies;

use App\Models\RegularIncomeScheduleVersion;
use App\Models\User;

class RegularIncomeScheduleVersionPolicy
{
    public function viewAny(User $user): bool   { return true; }
    public function view(User $user, RegularIncomeScheduleVersion $version): bool   { return $user->id === $version->user_id; }
    public function create(User $user): bool    { return true; }
    public function update(User $user, RegularIncomeScheduleVersion $version): bool { return $user->id === $version->user_id; }
    public function delete(User $user, RegularIncomeScheduleVersion $version): bool { return $user->id === $version->user_id; }
}
