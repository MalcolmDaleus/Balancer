<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Purchase extends Model
{
    use HasFactory, UserScopable, DateScopeable, MonthLockable;

    protected string $monthLockColumn = 'date';

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
        'date'        => 'datetime',
        'amount'      => 'decimal:2',
        'is_refunded' => 'boolean',
    ];

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

    public function refundIncomeEntry()
    {
        return $this->hasOne(IncomeEntry::class, 'purchase_id');
    }
}
