<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetPlan extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'month',
        'discretionary_cents',
        'bills_cents',
        'debt_payment_cents',
        'save_cents',
        'copied_from_month',
    ];

    protected function casts(): array
    {
        return [
            'month' => 'date',
            'copied_from_month' => 'date',
            'discretionary_cents' => 'integer',
            'bills_cents' => 'integer',
            'debt_payment_cents' => 'integer',
            'save_cents' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function envelopes(): HasMany
    {
        return $this->hasMany(BudgetEnvelope::class);
    }
}
