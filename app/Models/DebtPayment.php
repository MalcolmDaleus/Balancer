<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DebtPayment extends Model
{
    use HasFactory, UserScopable, DateScopeable;

    protected $fillable = [
        'user_id',
        'debt_id',
        'amount',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // ----------------------------------------------------------
    // Model Events
    // ----------------------------------------------------------

    /**
     * After a payment is saved, check whether the parent debt is now fully
     * paid off. If so, and if no settle_date has been set yet, stamp it now.
     */
    protected static function booted(): void
    {
        static::saved(function (DebtPayment $payment) {
            $debt = $payment->debt()->first();

            if ($debt && $debt->settle_date === null && $debt->remaining_balance <= 0) {
                $debt->settle_date = $payment->paid_at;
                $debt->saveQuietly();
            }
        });
    }

    // ----------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function debt()
    {
        return $this->belongsTo(Debt::class);
    }
}
