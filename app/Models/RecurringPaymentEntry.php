<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringPaymentEntry extends Model
{
    use HasFactory, UserScopable, SoftDeletes;

    protected $fillable = [
        'user_id',
        'recurring_payment_stream_id',
        'amount',
        'frequency',
        'day_of_month',
        'day_of_week',
        'start_date',
        'end_date',
        'active',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'start_date'   => 'date',
        'end_date'     => 'date',
        'day_of_month' => 'integer',
        'day_of_week'  => 'integer',
        'active'       => 'boolean',
    ];

    // ----------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function stream()
    {
        return $this->belongsTo(RecurringPaymentStream::class, 'recurring_payment_stream_id')
            ->withTrashed();
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class, 'recurring_payment_entry_id');
    }

    // ----------------------------------------------------------
    // Scopes
    // ----------------------------------------------------------

    /**
     * Entries that are active and in effect during the given month.
     */
    public function scopeActiveForMonth($query, Carbon $monthStart, Carbon $monthEnd)
    {
        return $query
            ->where('active', true)
            ->where('start_date', '<=', $monthEnd->toDateString())
            ->where(function ($q) use ($monthStart) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $monthStart->toDateString());
            });
    }
}
