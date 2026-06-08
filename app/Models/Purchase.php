<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use DateScopeable, HasFactory, MonthLockable, UserScopable;

    protected string $monthLockColumn = 'date';

    /** Refund flag updates are allowed on locked months (income posts to current month). */
    protected array $monthLockExemptAttributes = ['is_refunded'];

    protected $attributes = [
        'is_refunded' => false,
    ];

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
        'date',
        'attachment_path',
        'url',
        'is_refunded',
        'recurring_payment_entry_id',
    ];

    protected $casts = [
        'date' => 'datetime',
        'amount' => 'decimal:2',
        'is_refunded' => 'boolean',
    ];

    protected $appends = [
        'refunded_total',
        'remaining_refundable',
        'refund_status',
    ];

    /**
     * Total amount refunded across all linked income entries.
     */
    public function getRefundedTotalAttribute(): float
    {
        $paid = $this->relationLoaded('refundIncomeEntries')
            ? $this->refundIncomeEntries->sum('amount')
            : $this->refundIncomeEntries()->sum('amount');

        return round((float) $paid, 2);
    }

    /**
     * Amount of the original purchase still eligible for refund.
     */
    public function getRemainingRefundableAttribute(): float
    {
        return max(0.0, round((float) $this->amount - $this->refunded_total, 2));
    }

    /**
     * Refund lifecycle: none → partial → full.
     */
    public function getRefundStatusAttribute(): string
    {
        if ($this->is_refunded || $this->remaining_refundable <= 0) {
            return 'full';
        }

        if ($this->refunded_total > 0) {
            return 'partial';
        }

        return 'none';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(PurchaseCategory::class, 'category_id')->withTrashed();
    }

    public function recurringPaymentEntry()
    {
        return $this->belongsTo(RecurringPaymentEntry::class, 'recurring_payment_entry_id');
    }

    /** Refund income entries linked to this purchase (may be multiple for partial refunds). */
    public function refundIncomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'purchase_id');
    }
}
