<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Saving extends Model
{
    use HasFactory, UserScopable, DateScopeable, MonthLockable;

    protected string $monthLockColumn = 'month';

    protected $fillable = [
        'user_id',
        'amount',
        'type',
        'notes',
        'month',
    ];

    protected $casts = [
        'month'  => 'date',
        'amount' => 'decimal:2',
        'type'   => 'string',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}