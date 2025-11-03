<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\UserScopable;
use App\Models\Traits\DateScopeable;

class BalanceSheetTotal extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'month',
        'total_income',
        'total_debt_paid',
        'total_spending',
        'savings_snapshot',
        'roll_over',
    ];

    protected $casts = [
        'month' => 'date',
        'total_income' => 'decimal:2',
        'total_debt_paid' => 'decimal:2',
        'total_spending' => 'decimal:2',
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