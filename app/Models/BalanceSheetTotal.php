<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BalanceSheetTotal extends Model
{
    use DateScopeable, HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'month',
        'total_income',
        'total_debt_paid',
        'total_spending',
        'total_recurring',
        'savings_snapshot',
        'roll_over',
    ];

    protected $casts = [
        'month' => 'date',
        'total_income' => 'decimal:2',
        'total_debt_paid' => 'decimal:2',
        'total_spending' => 'decimal:2',
        'total_recurring' => 'decimal:2',
        'savings_snapshot' => 'decimal:2',
        'roll_over' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Derived attribute: net change
    public function getNetChangeAttribute()
    {
        return $this->total_income - ($this->total_spending + $this->total_debt_paid);
    }
}
