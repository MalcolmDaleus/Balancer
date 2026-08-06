<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecurringCharge extends Model
{
    use DateScopeable, HasFactory, MonthLockable, UserScopable;

    protected string $monthLockColumn = 'occurred_on';

    protected $fillable = [
        'user_id',
        'recurring_payment_entry_id',
        'recurring_payment_stream_id',
        'recurring_payment_category_id',
        'stream_name',
        'category_name',
        'amount',
        'occurred_on',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'occurred_on' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function entry()
    {
        return $this->belongsTo(RecurringPaymentEntry::class, 'recurring_payment_entry_id')
            ->withTrashed();
    }

    public function stream()
    {
        return $this->belongsTo(RecurringPaymentStream::class, 'recurring_payment_stream_id')
            ->withTrashed();
    }

    public function category()
    {
        return $this->belongsTo(RecurringPaymentCategory::class, 'recurring_payment_category_id')
            ->withTrashed();
    }
}
