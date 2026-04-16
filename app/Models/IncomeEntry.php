<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;

class IncomeEntry extends Model
{
    use HasFactory, UserScopable, DateScopeable, MonthLockable;

    protected $fillable = [
        'user_id',
        'income_stream_id',
        'amount',
        'month',
        'purchase_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'month' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function stream()
    {
        return $this->belongsTo(IncomeStream::class, 'income_stream_id')->withTrashed();
    }

    public function sourcePurchase()
    {
        return $this->belongsTo(Purchase::class, 'purchase_id');
    }
}