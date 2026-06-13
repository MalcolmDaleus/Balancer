<?php

namespace App\Policies;

use App\Models\RegularIncomeSchedule;
use App\Models\User;

class RegularIncomeSchedulePolicy
{
    public function viewAny(User $user): bool   { return true; }
    public function view(User $user, RegularIncomeSchedule $schedule): bool   { return $user->id === $schedule->user_id; }
    public function create(User $user): bool    { return true; }
    public function update(User $user, RegularIncomeSchedule $schedule): bool { return $user->id === $schedule->user_id; }
    public function delete(User $user, RegularIncomeSchedule $schedule): bool { return $user->id === $schedule->user_id; }
    public function restore(User $user, RegularIncomeSchedule $schedule): bool { return $user->id === $schedule->user_id; }
}
