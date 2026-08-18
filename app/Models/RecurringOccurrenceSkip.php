<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Model;

/**
 * Marks a due recurring occurrence that must not be re-materialized
 * (e.g. user deleted the generated RecurringCharge Fact in an open month).
 */
class RecurringOccurrenceSkip extends Model
{
    use UserScopable;

    protected $fillable = [
        'user_id',
        'recurring_payment_entry_id',
        'occurrence_date',
    ];

    protected $casts = [
        'occurrence_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function entry()
    {
        return $this->belongsTo(RecurringPaymentEntry::class, 'recurring_payment_entry_id');
    }
}
