<?php

namespace App\Models;

use App\Enums\IncomeScheduleFrequency;
use App\Models\Traits\UserScopable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegularIncomeScheduleVersion extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'regular_schedule_id',
        'amount',
        'frequency',
        'day_of_month',
        'day_of_week',
        'anchor_date',
        'start_date',
        'end_date',
        'active',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'frequency'    => IncomeScheduleFrequency::class,
        'day_of_month' => 'integer',
        'day_of_week'  => 'integer',
        'anchor_date'  => 'date',
        'start_date'   => 'date',
        'end_date'     => 'date',
        'active'       => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schedule()
    {
        return $this->belongsTo(RegularIncomeSchedule::class, 'regular_schedule_id')
            ->withTrashed();
    }

    public function entries()
    {
        return $this->hasMany(IncomeEntry::class, 'regular_schedule_version_id');
    }

    public function isEffectiveOn(Carbon|string $date): bool
    {
        $date = Carbon::parse($date)->startOfDay();

        if ($date->lt($this->start_date)) {
            return false;
        }

        if ($this->end_date !== null && $date->gt($this->end_date)) {
            return false;
        }

        return (bool) $this->active;
    }
}
