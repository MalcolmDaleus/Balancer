<?php

namespace App\Models;

use App\Enums\IncomeEntryType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;

class IncomeEntry extends Model
{
    use HasFactory, UserScopable, DateScopeable, MonthLockable;

    protected string $monthLockColumn = 'received_at';

    protected $fillable = [
        'user_id',
        'type',
        'name',
        'description',
        'received_at',
        'amount',
        'purchase_id',
        'regular_schedule_id',
        'regular_schedule_version_id',
    ];

    protected $casts = [
        'type'        => IncomeEntryType::class,
        'amount'      => 'decimal:2',
        'received_at' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function regularSchedule()
    {
        return $this->belongsTo(RegularIncomeSchedule::class, 'regular_schedule_id')->withTrashed();
    }

    public function regularScheduleVersion()
    {
        return $this->belongsTo(RegularIncomeScheduleVersion::class, 'regular_schedule_version_id');
    }

    public function sourcePurchase()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id');
    }
}
