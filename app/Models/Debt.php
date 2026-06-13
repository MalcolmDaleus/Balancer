<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Debt extends Model
{
    use DateScopeable, HasFactory, MonthLockable, UserScopable;

    protected string $monthLockColumn = 'issue_date';

    /** Forgiveness updates are allowed on locked months — payments are month-scoped separately. */
    protected array $monthLockExemptAttributes = ['is_forgiven', 'settle_date', 'notes'];

    protected $attributes = [
        'is_forgiven' => false,
    ];

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
        'issue_date',
        'settle_date',
        'is_forgiven',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'issue_date' => 'datetime',
        'settle_date' => 'datetime',
        'is_forgiven' => 'boolean',
    ];

    // ----------------------------------------------------------
    // Computed Accessors
    // ----------------------------------------------------------

    /**
     * Remaining balance computed entirely from debt_payments records.
     *
     * Reads from the eager-loaded `payments` relation when available (avoids
     * N+1 inside BalanceSheetService which loads debts with ->with('payments')).
     * Falls back to a live aggregate query otherwise.
     */
    public function getRemainingBalanceAttribute(): float
    {
        $paid = $this->relationLoaded('payments')
            ? $this->payments->sum('amount')
            : $this->payments()->sum('amount');

        return max(0.0, (float) $this->attributes['amount'] - (float) $paid);
    }

    /**
     * A debt is settled when all payments have brought the remaining balance to zero.
     * Forgiven debts are NOT considered settled — they are closed but unpaid.
     */
    public function getIsSettledAttribute(): bool
    {
        return ! $this->is_forgiven && $this->remaining_balance <= 0;
    }

    /**
     * A debt is closed (no longer active) if it is settled or forgiven.
     */
    public function getIsClosedAttribute(): bool
    {
        return $this->is_settled || $this->is_forgiven;
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
        return $this->belongsTo(DebtCategory::class, 'category_id')->withTrashed();
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
