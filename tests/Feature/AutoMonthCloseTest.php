<?php

use App\Models\BalanceSheetTotal;
use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use App\Services\AutoMonthCloseService;
use Carbon\Carbon;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow();
});

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

test('auto close locks the previous month for a new user with no activity', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-06-01']);

    $closed = (new AutoMonthCloseService)->closePendingMonths($user->id);

    expect($closed)->toBe(['2026-05']);

    $this->assertDatabaseHas('balance_sheet_totals', [
        'user_id' => $user->id,
    ]);

    $this->assertDatabaseCount('balance_sheet_totals', 1);
});

test('auto close locks empty previous month even when user was created this month', function () {
    Carbon::setTestNow('2026-06-15 08:00:00');

    $user = User::factory()->create(['created_at' => '2026-06-10']);

    (new AutoMonthCloseService)->closePendingMonths($user->id);

    $this->assertTrue(
        BalanceSheetTotal::where('user_id', $user->id)
            ->whereDate('month', '2026-05-01')
            ->exists()
    );
});

test('auto close locks full backlog when user returns after several months', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-03-01']);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'amount' => 1000,
        'received_at' => '2026-03-15',
    ]);

    // March already closed manually
    BalanceSheetTotal::create([
        'user_id' => $user->id,
        'month' => '2026-03-01',
        'total_income' => 1000,
        'total_debt_paid' => 0,
        'total_spending' => 0,
        'total_recurring' => 0,
        'savings_snapshot' => 0,
        'roll_over' => 0,
    ]);

    $closed = (new AutoMonthCloseService)->closePendingMonths($user->id);

    expect($closed)->toBe(['2026-04', '2026-05']);

    $this->assertDatabaseCount('balance_sheet_totals', 3);
});

test('auto close does not lock the current month', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-01-01']);

    (new AutoMonthCloseService)->closePendingMonths($user->id);

    $this->assertDatabaseMissing('balance_sheet_totals', [
        'user_id' => $user->id,
        'month' => '2026-06-01',
    ]);
});

test('auto close is idempotent when months are already locked', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-04-01']);

    BalanceSheetTotal::create([
        'user_id' => $user->id,
        'month' => '2026-05-01',
        'total_income' => 0,
        'total_debt_paid' => 0,
        'total_spending' => 0,
        'total_recurring' => 0,
        'savings_snapshot' => 0,
        'roll_over' => 0,
    ]);

    $closed = (new AutoMonthCloseService)->closePendingMonths($user->id);

    expect($closed)->toBe([]);
    $this->assertDatabaseCount('balance_sheet_totals', 1);
});

test('auto close starts from earliest financial activity', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-01-01']);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'amount' => 50,
        'date' => '2026-02-10',
    ]);

    $closed = (new AutoMonthCloseService)->closePendingMonths($user->id);

    expect($closed)->toBe(['2026-02', '2026-03', '2026-04', '2026-05']);
});

// ---------------------------------------------------------------------------
// Dashboard integration
// ---------------------------------------------------------------------------

test('dashboard visit auto closes pending months', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-04-01']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('closedMonths', 1)
            ->where('closedMonths.0', '2026-05')
        );

    $this->assertDatabaseHas('balance_sheet_totals', [
        'user_id' => $user->id,
    ]);
});

test('dashboard throttles auto close to once per session per calendar month', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-04-01']);

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
    $this->assertDatabaseCount('balance_sheet_totals', 1);

    // Delete snapshot to simulate unclosed month — throttle should prevent re-close
    BalanceSheetTotal::where('user_id', $user->id)->delete();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('closedMonths', [])
        );

    $this->assertDatabaseCount('balance_sheet_totals', 0);
});

test('dashboard passes closed months to inertia when backlog is closed', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-03-01']);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'amount' => 500,
        'received_at' => '2026-03-15',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('closedMonths', 3)
            ->where('closedMonths', ['2026-03', '2026-04', '2026-05'])
        );
});

// ---------------------------------------------------------------------------
// Pending toggle flush (occurrence-based, not month close)
// ---------------------------------------------------------------------------

test('month close does not flush recurring pending_active', function () {
    Carbon::setTestNow('2026-06-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-05-01']);

    $stream = RecurringPaymentStream::factory()->create([
        'user_id'        => $user->id,
        'active'         => true,
        'pending_active' => false,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
    ]);

    (new AutoMonthCloseService)->closePendingMonths($user->id);

    $stream->refresh();
    expect($stream->active)->toBeTrue();
    expect($stream->pending_active)->toBeFalse();
});
