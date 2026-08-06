<?php

namespace App\Models\Traits;

use App\Services\MonthLockService;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait MonthLockable
 *
 * Enforces month-lock rules at the Eloquent model layer for any model that
 * represents financial data scoped to a calendar month.
 *
 * How it works
 * ------------
 * Boot hooks intercept creating, updating, and deleting events and call
 * MonthLockService::assertUnlocked() using the model's designated date
 * column. If a BalanceSheetTotal row already exists for that user + month,
 * MonthLockedException (HTTP 423) is thrown and the write is aborted.
 *
 * On update, BOTH the original month AND the new month are checked.
 * This prevents moving a record from a locked month into a new one (or
 * vice-versa) as either would silently alter a closed month's totals.
 *
 * Usage
 * -----
 * 1. Add `use MonthLockable;` to the model.
 * 2. Optionally declare `protected string $monthLockColumn = 'date';`
 *    to specify which column holds the date/datetime to derive the month
 *    from. Defaults to 'month' if not declared.
 */
trait MonthLockable
{
    protected static function bootMonthLockable(): void
    {
        static::creating(function ($model) {
            MonthLockService::assertUnlocked(
                $model->user_id,
                $model->{$model->getMonthLockColumn()}
            );
        });

        static::updating(function ($model) {
            if (static::isMonthLockExemptUpdate($model)) {
                return;
            }

            $column = $model->getMonthLockColumn();

            // Always guard the month the record currently/will live in.
            MonthLockService::assertUnlocked($model->user_id, $model->{$column});

            // If the date column itself is being changed, also guard the
            // original month — otherwise a record could be silently moved
            // out of a locked month, altering its historical totals.
            if ($model->isDirty($column)) {
                MonthLockService::assertUnlocked(
                    $model->user_id,
                    $model->getOriginal($column)
                );
            }
        });

        static::deleting(function ($model) {
            // Soft-archive of instruments may be allowed even when the
            // instrument's own date sits in a locked month (Facts stay).
            if (static::allowsSoftDeleteWhenLocked($model)) {
                return;
            }

            MonthLockService::assertUnlocked(
                $model->user_id,
                $model->{$model->getMonthLockColumn()}
            );
        });
    }

    /**
     * SoftDeletes models may opt in via: protected bool $monthLockAllowsSoftDelete = true;
     * Force-deletes always remain month-locked.
     */
    protected static function allowsSoftDeleteWhenLocked(Model $model): bool
    {
        if (! property_exists($model, 'monthLockAllowsSoftDelete') || ! $model->monthLockAllowsSoftDelete) {
            return false;
        }

        if (! method_exists($model, 'isForceDeleting')) {
            return false;
        }

        return ! $model->isForceDeleting();
    }

    /**
     * Returns the column name used to derive the month for lock checks.
     * Models can override by declaring: protected string $monthLockColumn = 'paid_at';
     */
    public function getMonthLockColumn(): string
    {
        return property_exists($this, 'monthLockColumn')
            ? $this->monthLockColumn
            : 'month';
    }

    /**
     * Skip lock checks when an update only touches exempt attributes
     * (e.g. marking a purchase as refunded after month close).
     */
    protected static function isMonthLockExemptUpdate(Model $model): bool
    {
        $exempt = property_exists($model, 'monthLockExemptAttributes')
            ? $model->monthLockExemptAttributes
            : [];

        if ($exempt === []) {
            return false;
        }

        $dirty = array_keys($model->getDirty());
        $significant = array_diff($dirty, ['updated_at', 'created_at']);

        return $significant !== [] && array_diff($significant, $exempt) === [];
    }
}
