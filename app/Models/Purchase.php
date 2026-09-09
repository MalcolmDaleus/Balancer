<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use App\Support\MoneyCents;
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
    ];

    protected $casts = [
        'date' => 'datetime',
        'amount' => 'decimal:2',
        'is_refunded' => 'boolean',
    ];

    protected $appends = [
        'refunded_cents',
        'remaining_refundable_cents',
        'refund_status',
    ];

    public function getRefundedCentsAttribute(): int
    {
        if ($this->relationLoaded('refundIncomeEntries')) {
            return MoneyCents::sumMajors($this->refundIncomeEntries->pluck('amount'));
        }

        return MoneyCents::fromMajor($this->refundIncomeEntries()->sum('amount'));
    }

    public function getRemainingRefundableCentsAttribute(): int
    {
        return max(0, MoneyCents::fromMajor($this->amount) - $this->refunded_cents);
    }

    /**
     * Refund lifecycle: none → partial → full.
     */
    public function getRefundStatusAttribute(): string
    {
        if ($this->is_refunded || $this->remaining_refundable_cents <= 0) {
            return 'full';
        }

        if ($this->refunded_cents > 0) {
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

    /** Refund income entries linked to this purchase (may be multiple for partial refunds). */
    public function refundIncomeEntries()
    {
        return $this->hasMany(IncomeEntry::class, 'purchase_id');
    }
}
