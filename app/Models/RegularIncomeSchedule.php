<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RegularIncomeSchedule extends Model
{
    use HasFactory, UserScopable, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'active',
        'pending_active',
    ];

    protected $casts = [
        'active'         => 'boolean',
        'pending_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function versions()
    {
        return $this->hasMany(RegularIncomeScheduleVersion::class, 'regular_schedule_id');
    }

    public function entries()
    {
        return $this->hasMany(IncomeEntry::class, 'regular_schedule_id');
    }

    public function activeVersion()
    {
        return $this->hasOne(RegularIncomeScheduleVersion::class, 'regular_schedule_id')
            ->where('active', true)
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', now()->toDateString());
            })
            ->latest('start_date');
    }
}
