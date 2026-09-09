<?php

namespace App\Models;

use App\Models\Traits\DateScopeable;
use App\Models\Traits\MonthLockable;
use App\Models\Traits\UserScopable;
use App\Support\MoneyCents;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Saving extends Model
{
    use DateScopeable, HasFactory, MonthLockable, UserScopable;

    protected string $monthLockColumn = 'month';

    protected $fillable = [
        'user_id',
        'amount',
        'type',
        'notes',
        'month',
    ];

    protected $casts = [
        'month' => 'date',
        'amount' => 'decimal:2',
        'type' => 'string',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Signed running savings balance in cents (deposits − withdrawals) through as-of month.
     */
    public static function runningBalance(int $userId, ?string $asOfMonth = null, ?int $excludeId = null): int
    {
        $query = static::query()
            ->where('user_id', $userId)
            ->selectRaw("COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) as net");

        if ($asOfMonth !== null) {
            $query->whereDate('month', '<=', $asOfMonth);
        }

        if ($excludeId !== null) {
            $query->where('id', '!=', $excludeId);
        }

        return MoneyCents::fromMajor($query->value('net'));
    }
}
