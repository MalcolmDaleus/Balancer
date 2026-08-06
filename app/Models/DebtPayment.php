<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DebtPayment extends Model
{
    use HasFactory, UserScopable, DateScopeable, MonthLockable;

    protected string $monthLockColumn = 'paid_at';

    protected $fillable = [
        'user_id',
        'debt_id',
        'amount',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // ----------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function debt()
    {
        return $this->belongsTo(Debt::class)->withTrashed();
    }
}
