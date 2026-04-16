<?php

use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\DebtCategory;
use App\Models\DebtPayment;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access debts', function () {
    $this->getJson('/api/v1/debts')->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Debts CRUD
// ---------------------------------------------------------------------------

test('user can list their debts', function () {
    $user = User::factory()->create();
    Debt::factory()->count(2)->create(['user_id' => $user->id]);
    Debt::factory()->count(3)->create(); // other user

    $this->actingAs($user)->getJson('/api/v1/debts')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can create a debt', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/debts', [
        'amount'      => 1500.00,
        'description' => 'Car loan',
        'issue_date'  => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.description', 'Car loan')
        ->assertJsonPath('data.is_settled', false);
    $this->assertEquals(1500, $response->json('data.remaining_balance'));
});

test('store debt fails validation with missing fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/debts', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed')
        ->assertJsonStructure(['details' => ['amount', 'description', 'issue_date']]);
});

test('settle_date must be after or equal to issue_date', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/debts', [
        'amount'      => 500.00,
        'description' => 'Test',
        'issue_date'  => '2026-04-01',
        'settle_date' => '2026-03-01',
    ])->assertStatus(422);
});

test('update settle_date cannot be before existing issue_date', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create([
        'user_id'    => $user->id,
        'issue_date' => '2026-04-01',
    ]);

    $this->actingAs($user)->putJson("/api/v1/debts/{$debt->id}", [
        'settle_date' => '2026-03-01',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('user can view their debt', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/debts/{$debt->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $debt->id)
        ->assertJsonStructure(['data' => ['remaining_balance', 'is_settled']]);
});

test('user cannot view another user\'s debt', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $debt  = Debt::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/debts/{$debt->id}")
        ->assertStatus(403);
});

test('user can update their debt', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id, 'description' => 'Old']);

    $this->actingAs($user)->putJson("/api/v1/debts/{$debt->id}", [
        'description' => 'Updated',
    ])->assertOk()->assertJsonPath('data.description', 'Updated');
});

test('user can delete their debt', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/debts/{$debt->id}")
        ->assertNoContent();
});

// ---------------------------------------------------------------------------
// Debt Payments
// ---------------------------------------------------------------------------

test('user can list payments for their debt', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id, 'amount' => 1000]);
    DebtPayment::factory()->count(3)->create(['user_id' => $user->id, 'debt_id' => $debt->id]);

    $this->actingAs($user)->getJson("/api/v1/debts/{$debt->id}/payments")
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user cannot list payments for another user\'s debt', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $debt  = Debt::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/debts/{$debt->id}/payments")
        ->assertStatus(403);
});

test('user can add a payment to their debt', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id, 'amount' => 1000]);

    $response = $this->actingAs($user)->postJson("/api/v1/debts/{$debt->id}/payments", [
        'amount'  => 250.00,
        'paid_at' => '2026-04-15',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.debt_id', $debt->id);
    $this->assertEquals(250, $response->json('data.amount'));
});

test('user cannot add payment to another user\'s debt', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $debt  = Debt::factory()->create(['user_id' => $other->id, 'amount' => 1000]);

    $this->actingAs($user)->postJson("/api/v1/debts/{$debt->id}/payments", [
        'amount'  => 100.00,
        'paid_at' => '2026-04-15',
    ])->assertStatus(403);
});

test('user can update their payment', function () {
    $user    = User::factory()->create();
    $debt    = Debt::factory()->create(['user_id' => $user->id, 'amount' => 1000]);
    $payment = DebtPayment::factory()->create(['user_id' => $user->id, 'debt_id' => $debt->id, 'amount' => 100]);

    $response = $this->actingAs($user)->putJson("/api/v1/debt-payments/{$payment->id}", [
        'amount' => 150.00,
    ])->assertOk();
    $this->assertEquals(150, $response->json('data.amount'));
});

test('user cannot update another user\'s payment', function () {
    $user    = User::factory()->create();
    $other   = User::factory()->create();
    $debt    = Debt::factory()->create(['user_id' => $other->id, 'amount' => 1000]);
    $payment = DebtPayment::factory()->create(['user_id' => $other->id, 'debt_id' => $debt->id]);

    $this->actingAs($user)->putJson("/api/v1/debt-payments/{$payment->id}", [
        'amount' => 999.00,
    ])->assertStatus(403);
});

test('user can delete their payment', function () {
    $user    = User::factory()->create();
    $debt    = Debt::factory()->create(['user_id' => $user->id, 'amount' => 1000]);
    $payment = DebtPayment::factory()->create(['user_id' => $user->id, 'debt_id' => $debt->id]);

    $this->actingAs($user)->deleteJson("/api/v1/debt-payments/{$payment->id}")
        ->assertNoContent();
});

// ---------------------------------------------------------------------------
// Month lock on debt payments
// ---------------------------------------------------------------------------

test('payment on locked month returns 423', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id, 'amount' => 1000]);

    BalanceSheetTotal::create([
        'user_id'          => $user->id,
        'month'            => '2026-03-01',
        'total_income'     => 0,
        'total_debt_paid'  => 0,
        'total_spending'   => 0,
        'savings_snapshot' => 0,
        'roll_over'        => 0,
    ]);

    $this->actingAs($user)->postJson("/api/v1/debts/{$debt->id}/payments", [
        'amount'  => 100.00,
        'paid_at' => '2026-03-10',
    ])->assertStatus(423)
      ->assertJsonPath('error', 'month_locked');
});
