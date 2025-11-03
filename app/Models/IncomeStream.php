<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncomeStream extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'description',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(IncomeCategory::class, 'category_id');
    }

    public function entries()
    {
        return $this->hasMany(IncomeEntry::class, 'income_stream_id');
    }
}
