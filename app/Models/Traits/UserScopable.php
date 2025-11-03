<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait UserScopable
{
    /**
     * Scope a query to only include records for a specific user
     *
     * @param Builder $query
     * @param int $userId
     * @return Builder
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}