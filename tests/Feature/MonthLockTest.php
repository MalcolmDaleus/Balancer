<?php

use App\Exceptions\MonthLockedException;
use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\DebtCategory;
use App\Models\DebtPayment;
use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\Saving;
use App\Models\User;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create and return a user with a locked month (has a BalanceSheetTotal row).
 * Returns [$user, $lockedMonth string 'YYYY-MM-01'].
 */
function userWithLockedMonth(): array
{
    $user = User::factory()->create();
    $month = '2025-01-01';

    BalanceSheetTotal::create([
        'user_id' => $user->id,
        'month' => $month,
        'total_income' => 0,
        'total_debt_paid' => 0,
        'total_spending' => 0,
        'savings_snapshot' => 0,
        'roll_over' => 0,
    ]);

    return [$user, $month];
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

test('creating a purchase in a locked month throws MonthLockedException', function () {
    [$user, $month] = userWithLockedMonth();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    expect(fn () => Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 50.00,
        'description' => 'Locked purchase',
        'date' => $month,
    ]))->toThrow(MonthLockedException::class);
});

test('creating a purchase in an unlocked month succeeds', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 20.00,
        'description' => 'Free month',
        'date' => '2025-03-15',
    ]);

    expect($purchase->exists)->toBeTrue();
});

test('updating a purchase in a locked month throws MonthLockedException', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 20.00,
        'description' => 'Will be locked',
        'date' => '2025-02-10',
    ]);

    // Now lock that month
    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-02-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $purchase->update(['amount' => 99.00]))
        ->toThrow(MonthLockedException::class);
});

test('marking a purchase as refunded in a locked month is allowed', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 20.00,
        'description' => 'Will be locked',
        'date' => '2025-02-10',
        'is_refunded' => false,
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-02-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    $purchase->update(['is_refunded' => true]);

    expect($purchase->fresh()->is_refunded)->toBeTrue();
});

test('deleting a purchase in a locked month throws MonthLockedException', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 10.00,
        'description' => 'Will be locked',
        'date' => '2025-04-05',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-04-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $purchase->delete())->toThrow(MonthLockedException::class);
});

// ---------------------------------------------------------------------------
// IncomeEntry
// ---------------------------------------------------------------------------

test('creating an income entry in a locked month throws MonthLockedException', function () {
    [$user, $month] = userWithLockedMonth();

    expect(fn () => IncomeEntry::create([
        'user_id'     => $user->id,
        'type'        => IncomeEntryType::Irregular,
        'name'        => 'Locked income',
        'amount'      => 1000.00,
        'received_at' => $month,
    ]))->toThrow(MonthLockedException::class);
});

test('deleting an income entry in a locked month throws MonthLockedException', function () {
    $user = User::factory()->create();

    $entry = IncomeEntry::create([
        'user_id'     => $user->id,
        'type'        => IncomeEntryType::Irregular,
        'name'        => 'Test income',
        'amount'      => 500.00,
        'received_at' => '2025-06-15',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-06-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $entry->delete())->toThrow(MonthLockedException::class);
});

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

test('creating a saving in a locked month throws MonthLockedException', function () {
    [$user, $month] = userWithLockedMonth();

    expect(fn () => Saving::create([
        'user_id' => $user->id,
        'amount' => 200.00,
        'month' => $month,
    ]))->toThrow(MonthLockedException::class);
});

test('deleting a saving in a locked month throws MonthLockedException', function () {
    $user = User::factory()->create();

    $saving = Saving::create([
        'user_id' => $user->id,
        'amount' => 150.00,
        'month' => '2025-05-01',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-05-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $saving->delete())->toThrow(MonthLockedException::class);
});

// ---------------------------------------------------------------------------
// DebtPayment
// ---------------------------------------------------------------------------

test('creating a debt payment in a locked month throws MonthLockedException', function () {
    [$user, $month] = userWithLockedMonth();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);
    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 500.00,
        'description' => 'Old debt',
        'issue_date' => '2024-11-01',
    ]);

    expect(fn () => DebtPayment::create([
        'user_id' => $user->id,
        'debt_id' => $debt->id,
        'amount' => 50.00,
        'paid_at' => $month,
    ]))->toThrow(MonthLockedException::class);
});

test('deleting a debt payment in a locked month throws MonthLockedException', function () {
    $user = User::factory()->create();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);
    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 500.00,
        'description' => 'Debt',
        'issue_date' => '2024-11-01',
    ]);

    $payment = DebtPayment::create([
        'user_id' => $user->id,
        'debt_id' => $debt->id,
        'amount' => 25.00,
        'paid_at' => '2025-07-15',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-07-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $payment->delete())->toThrow(MonthLockedException::class);
});

// ---------------------------------------------------------------------------
// Debt (issue_date month)
// ---------------------------------------------------------------------------

test('creating a debt in a locked month throws MonthLockedException', function () {
    [$user, $month] = userWithLockedMonth();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);

    expect(fn () => Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 300.00,
        'description' => 'Locked debt',
        'issue_date' => $month,
    ]))->toThrow(MonthLockedException::class);
});

test('soft-archiving a debt in a locked issue month is allowed', function () {
    $user = User::factory()->create();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);

    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 100.00,
        'description' => 'Will lock',
        'issue_date' => '2025-08-01',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-08-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    $debt->delete();
    expect(Debt::find($debt->id))->toBeNull();
    expect(Debt::withTrashed()->find($debt->id)->trashed())->toBeTrue();
});

test('force-deleting a debt in a locked issue month throws MonthLockedException', function () {
    $user = User::factory()->create();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);

    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 100.00,
        'description' => 'Will lock',
        'issue_date' => '2025-08-01',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-08-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $debt->forceDelete())->toThrow(MonthLockedException::class);
});

test('forgiving a debt whose issue_date is in a locked month is allowed', function () {
    $user = User::factory()->create();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);

    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 250.00,
        'description' => 'Will lock',
        'issue_date' => '2025-08-01',
        'is_forgiven' => false,
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-08-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    $debt->update([
        'is_forgiven' => true,
        'settle_date' => '2025-09-15',
    ]);

    expect($debt->fresh()->is_forgiven)->toBeTrue();
});

test('updating a debt amount in a locked issue month throws MonthLockedException', function () {
    $user = User::factory()->create();
    $cat = DebtCategory::factory()->create(['user_id' => $user->id]);

    $debt = Debt::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 100.00,
        'description' => 'Will lock',
        'issue_date' => '2025-08-01',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-08-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $debt->update(['amount' => 999.00]))
        ->toThrow(MonthLockedException::class);
});

// ---------------------------------------------------------------------------
// Cross-month update guard
// ---------------------------------------------------------------------------

test('moving a purchase from an unlocked month into a locked month is blocked', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    // Purchase in an unlocked month
    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 30.00,
        'description' => 'Free month purchase',
        'date' => '2025-09-10',
    ]);

    // Lock a different (target) month
    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-10-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    expect(fn () => $purchase->update(['date' => '2025-10-15']))
        ->toThrow(MonthLockedException::class);
});

test('moving a purchase out of a locked month is also blocked', function () {
    $user = User::factory()->create();
    $cat = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $purchase = Purchase::create([
        'user_id' => $user->id,
        'category_id' => $cat->id,
        'amount' => 30.00,
        'description' => 'Locked month purchase',
        'date' => '2025-11-10',
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id, 'month' => '2025-11-01',
        'total_income' => 0, 'total_debt_paid' => 0,
        'total_spending' => 0, 'savings_snapshot' => 0, 'roll_over' => 0,
    ]);

    // Try to move to an unlocked month
    expect(fn () => $purchase->update(['date' => '2025-12-10']))
        ->toThrow(MonthLockedException::class);
});
