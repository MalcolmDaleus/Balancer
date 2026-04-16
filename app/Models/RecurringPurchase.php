<?php

namespace App\Models;

use App\Models\Traits\UserScopable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecurringPurchase extends Model
{
    use HasFactory, UserScopable;

    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'description',
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

    public function category()
    {
        return $this->belongsTo(PurchaseCategory::class, 'category_id');
    }

    /**
     * All purchases that were auto-generated from this recurring definition.
     */
    public function purchases()
    {
        return $this->hasMany(Purchase::class, 'recurring_purchase_id');
    }

    // ----------------------------------------------------------
    // Scopes
    // ----------------------------------------------------------

    /**
     * Only active definitions that are currently in their active window.
     */
    public function scopeActiveOn($query, \Carbon\Carbon $date)
    {
        return $query
            ->where('active', true)
            ->where('start_date', '<=', $date->toDateString())
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $date->toDateString());
            });
    }
}
