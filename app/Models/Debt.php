<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\UserScopable;
use App\Models\Traits\DateScopeable;

class Debt extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
        'issue_date',
        'settle_date',
        'remaining_balance',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'issue_date' => 'datetime',
        'settle_date' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(DebtCategory::class, 'category_id');
    }

    public function getIsSettledAttribute()
    {
        return $this->settle_date !== null;
    }
}