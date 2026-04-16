<?php

use App\Models\BalanceSheetTotal;
use App\Models\IncomeEntry;
use App\Models\IncomeStream;
use App\Models\Purchase;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access balance sheet', function () {
    $this->getJson('/api/v1/balance-sheet')->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Summary / Expanded
// ---------------------------------------------------------------------------

test('user can get simplified balance sheet for a month', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    IncomeEntry::factory()->create([
        'user_id'          => $user->id,
        'income_stream_id' => $stream->id,
        'amount'           => 3000.00,
        'month'            => '2026-04-01',
    ]);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'amount'  => 500.00,
        'date'    => '2026-04-15',
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/balance-sheet/summary?month=2026-04');

    $response->assertOk()
        ->assertJsonStructure(['user_id', 'month', 'total_income', 'total_debt_paid', 'total_spending', 'total_recurring', 'savings_snapshot', 'roll_over']);
    $this->assertEquals(3000, $response->json('total_income'));
    $this->assertEquals(500, $response->json('total_spending'));
});

test('user can get expanded balance sheet', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/balance-sheet?month=2026-04');

    $response->assertOk()
        ->assertJsonStructure(['user_id', 'month', 'income', 'debt', 'spending', 'recurring_payments', 'savings', 'roll_over']);
});

// ---------------------------------------------------------------------------
// Close (persist snapshot / lock month)
// ---------------------------------------------------------------------------

test('user can close a month creating a snapshot', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/balance-sheet/close', [
        'month' => '2026-03',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.month', '2026-03-01')
        ->assertJsonStructure(['data' => ['id', 'user_id', 'month', 'total_income', 'roll_over']]);

    $this->assertTrue(
        \Illuminate\Support\Facades\DB::table('balance_sheet_totals')
            ->where('user_id', $user->id)
            ->whereDate('month', '2026-03-01')
            ->exists()
    );
});

test('close month is idempotent (updates existing snapshot)', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/balance-sheet/close', ['month' => '2026-02'])->assertSuccessful();
    $this->actingAs($user)->postJson('/api/v1/balance-sheet/close', ['month' => '2026-02'])->assertSuccessful();

    $this->assertDatabaseCount('balance_sheet_totals', 1);
});

test('close month requires month field', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/balance-sheet/close', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

test('user can get balance sheet history', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();

    // Create 5 known snapshots within the last 12 months for the user
    foreach (range(1, 5) as $i) {
        BalanceSheetTotal::create([
            'user_id'          => $user->id,
            'month'            => now()->subMonths($i)->startOfMonth()->toDateString(),
            'total_income'     => 0,
            'total_debt_paid'  => 0,
            'total_spending'   => 0,
            'total_recurring'  => 0,
            'savings_snapshot' => 0,
            'roll_over'        => 0,
        ]);
    }

    // Other user's snapshots should not appear
    BalanceSheetTotal::create([
        'user_id'          => $other->id,
        'month'            => now()->subMonths(1)->startOfMonth()->toDateString(),
        'total_income'     => 0,
        'total_debt_paid'  => 0,
        'total_spending'   => 0,
        'total_recurring'  => 0,
        'savings_snapshot' => 0,
        'roll_over'        => 0,
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/balance-sheet/history?months=12');

    $response->assertOk()->assertJsonCount(5, 'data');
});

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

test('user can compare two months', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/balance-sheet/compare?month_a=2026-03&month_b=2026-04');

    $response->assertOk()
        ->assertJsonStructure(['income', 'debt', 'spending', 'recurring', 'savings', 'rollover']);
});

test('compare requires both month params', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet/compare?month_a=2026-03')
        ->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Destroy (unlock month)
// ---------------------------------------------------------------------------

test('user can delete a snapshot to unlock a month', function () {
    $user     = User::factory()->create();
    $snapshot = BalanceSheetTotal::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/balance-sheet/{$snapshot->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('balance_sheet_totals', ['id' => $snapshot->id]);
});

test('user cannot delete another user\'s snapshot', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $snapshot = BalanceSheetTotal::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/balance-sheet/{$snapshot->id}")
        ->assertStatus(403);
});
