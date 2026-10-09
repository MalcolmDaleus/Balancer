<?php

namespace App\Services;

use App\Models\DebtCategory;
use App\Models\PurchaseCategory;
use App\Models\RecurringPaymentCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DefaultCategoryService
{
    public const PURCHASE = ['Groceries', 'Dining', 'Household', 'Entertainment', 'Gifts', 'Other'];

    public const DEBT = ['Personal', 'Loan'];

    public const RECURRING = ['Rent / Mortgage', 'Utilities', 'Subscriptions', 'Insurance', 'Phone / Internet'];

    /**
     * Gives a user a starter set per category type. A type the user already has
     * categories for (including archived ones) is left untouched.
     */
    public function seedFor(User $user): void
    {
        DB::transaction(function () use ($user) {
            $this->fill(PurchaseCategory::class, $user, self::PURCHASE);
            $this->fill(DebtCategory::class, $user, self::DEBT);
            $this->fill(RecurringPaymentCategory::class, $user, self::RECURRING);
        });
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<string>  $names
     */
    private function fill(string $model, User $user, array $names): void
    {
        if ($model::withTrashed()->where('user_id', $user->id)->exists()) {
            return;
        }

        foreach ($names as $name) {
            $model::create(['user_id' => $user->id, 'name' => $name]);
        }
    }
}
