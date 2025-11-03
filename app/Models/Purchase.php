<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
        'date',
        'attachment_path',
        'url',
    ];

    protected $casts = [
        'date' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(PurchaseCategory::class, 'category_id');
    }
}
