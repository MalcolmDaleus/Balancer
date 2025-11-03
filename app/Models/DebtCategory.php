<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\UserScopable;

class DebtCategory extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'category_name',
    ];

    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function debts()
    {
        return $this->hasMany(Debt::class, 'category_id');
    }
}
