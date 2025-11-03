<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Saving extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'amount',
        'month',
    ];

    protected $casts = [
        'month' => 'date',
        'amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}