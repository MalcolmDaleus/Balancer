<?php

namespace App\Models;

use App\Enums\BudgetEnvelopeDomain;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetEnvelope extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'budget_plan_id',
        'domain',
        'category_id',
        'amount_cents',
    ];

    protected function casts(): array
    {
        return [
            'domain' => BudgetEnvelopeDomain::class,
            'category_id' => 'integer',
            'amount_cents' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id');
    }
}
