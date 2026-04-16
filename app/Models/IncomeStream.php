<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncomeStream extends Model
{
    use HasFactory, UserScopable, SoftDeletes;

    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(IncomeCategory::class, 'category_id')->withTrashed();
    }

    public function scopeUserVisible($query)
    {
        return $query->where('is_system', false);
    }

    public function entries()
    {
        return $this->hasMany(IncomeEntry::class, 'income_stream_id');
    }
}
