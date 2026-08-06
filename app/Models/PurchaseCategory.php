<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseCategory extends Model
{
    use HasFactory, SoftDeletes, UserScopable;

    protected $fillable = [
        'user_id',
        'name',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class, 'category_id');
    }
}
