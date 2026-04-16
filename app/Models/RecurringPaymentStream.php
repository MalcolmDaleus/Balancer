<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringPaymentStream extends Model
{
    use HasFactory, UserScopable, SoftDeletes;

    protected $fillable = [
        'user_id',
        'recurring_payment_category_id',
        'name',
        'description',
    ];

    // ----------------------------------------------------------
    // Relationships
    // ----------------------------------------------------------

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(RecurringPaymentCategory::class, 'recurring_payment_category_id')
            ->withTrashed();
    }

    public function entries()
    {
        return $this->hasMany(RecurringPaymentEntry::class, 'recurring_payment_stream_id');
    }

    /**
     * The currently active entry — there should be at most one at any given time.
     */
    public function activeEntry()
    {
        return $this->hasOne(RecurringPaymentEntry::class, 'recurring_payment_stream_id')
            ->where('active', true)
            ->whereNull('end_date')
            ->orWhere('end_date', '>=', now()->toDateString());
    }
}
