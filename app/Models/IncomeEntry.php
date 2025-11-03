<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\UserScopable;
use App\Models\Traits\DateScopeable;

class IncomeEntry extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'income_stream_id',
        'amount',
        'month',
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
        return $this->belongsTo(IncomeStream::class, 'income_stream_id');
    }
}