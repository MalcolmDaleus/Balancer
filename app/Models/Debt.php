<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Debt extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
        'issue_date',
        'settle_date',
        'remaining_balance', // kept for backward-compat; authoritative value is computed via accessor
        'notes',
    ];

    protected $casts = [
        'amount'            => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'issue_date'        => 'datetime',
        'settle_date'       => 'datetime',
    ];

    // ----------------------------------------------------------
    // Computed Accessors
    // ----------------------------------------------------------

    /**
     * Returns the current remaining balance computed from actual payments.
     *
     * Reads from the eager-loaded `payments` relation when available (avoids N+1
     * inside BalanceSheetService which loads debts with ->with('payments')).
     * Falls back to a DB aggregate query otherwise.
     *
     * NOTE: This accessor shadows the legacy `remaining_balance` DB column.
     *       The column is kept for backward compatibility but is no longer
     *       authoritative — DebtPayment records are the source of truth.
     */
    public function getRemainingBalanceAttribute(): float
    {
        $paid = $this->relationLoaded('payments')
            ? $this->payments->sum('amount')
            : $this->payments()->sum('amount');

        // Computed from the original principal minus all recorded payments.
        // The legacy DB column `remaining_balance` is no longer authoritative.
        return max(0.0, (float) $this->attributes['amount'] - (float) $paid);
    }

    /**
     * A debt is settled if settle_date is explicitly set OR if all payments
     * have brought the remaining balance to zero or below.
     */
    public function getIsSettledAttribute(): bool
    {
        return $this->settle_date !== null || $this->remaining_balance <= 0;
    }

    // ----------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(DebtCategory::class, 'category_id');
    }

    public function payments()
    {
        return $this->hasMany(DebtPayment::class);
    }

    // ----------------------------------------------------------
    // Helper
    // ----------------------------------------------------------

    /**
     * Total amount paid across all recorded payments.
     */
    public function totalPaid(): float
    {
        return $this->relationLoaded('payments')
            ? (float) $this->payments->sum('amount')
            : (float) $this->payments()->sum('amount');
    }
}
