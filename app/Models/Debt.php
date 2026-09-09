<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use App\Services\MonthLockService;
use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Debt extends Model
{
    use DateScopeable, HasFactory, MonthLockable, SoftDeletes, UserScopable;

    protected string $monthLockColumn = 'issue_date';

    /** Forgiveness / settlement updates are allowed on locked months. */
    protected array $monthLockExemptAttributes = ['is_forgiven', 'settle_date', 'notes'];

    /** Soft-archive hides the instrument; payment Facts remain for locked history. */
    protected bool $monthLockAllowsSoftDelete = true;

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
    public function getRemainingCentsAttribute(): int
    {
        $paid = $this->relationLoaded('payments')
            ? MoneyCents::sumMajors($this->payments->pluck('amount'))
            : MoneyCents::fromMajor($this->payments()->sum('amount'));

        return max(0, MoneyCents::fromMajor($this->attributes['amount'] ?? 0) - $paid);
    }

    /**
     * A debt is settled when all payments have brought the remaining balance to zero.
     * Forgiven debts are NOT considered settled — they are closed but unpaid.
     */
    public function getIsSettledAttribute(): bool
    {
        return ! $this->is_forgiven && $this->remaining_cents <= 0;
    }

    /**
     * A debt is closed (no longer active) if it is settled or forgiven.
     */
    public function getIsClosedAttribute(): bool
    {
        return $this->is_settled || $this->is_forgiven;
    }

    public function hasPaymentFacts(): bool
    {
        if ($this->relationLoaded('payments')) {
            return $this->payments->isNotEmpty();
        }

        return $this->payments()->exists();
    }

    /**
     * Permanent delete is allowed only for open debts with no payment Facts
     * and an unlocked issue month. Closed debts are archived instead.
     */
    public function canHardDelete(): bool
    {
        if ($this->is_closed || $this->hasPaymentFacts()) {
            return false;
        }

        return ! MonthLockService::isLocked((int) $this->user_id, $this->issue_date);
    }

    /**
     * Soft-archive is only for settled or forgiven debts. An open liability
     * must be paid or forgiven, not hidden.
     */
    public function canArchive(): bool
    {
        return $this->is_closed;
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
}
