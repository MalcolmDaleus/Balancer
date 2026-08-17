<?php

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\PurchaseCategory;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use Carbon\Carbon;

afterEach(function () {
    Carbon::setTestNow();
});

test('unverified user cannot access the API', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet/summary')
        ->assertStatus(403);
});

test('cannot close a future month', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/balance-sheet/close', [
        'month' => '2026-07',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('debt amount cannot drop below total payments', function () {
    $user = User::factory()->create();
    $debt = Debt::factory()->create(['user_id' => $user->id, 'amount' => 500]);
    DebtPayment::factory()->create([
        'user_id' => $user->id,
        'debt_id' => $debt->id,
        'amount'  => 200,
    ]);

    $this->actingAs($user)->putJson("/api/v1/debts/{$debt->id}", [
        'amount' => 100,
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('duplicate active purchase category name is rejected', function () {
    $user = User::factory()->create();
    PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Food']);

    $this->actingAs($user)->postJson('/api/v1/categories/purchases', [
        'name' => 'Food',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('restore of another users stream returns 404 not 403', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $other->id]);
    $stream->delete();

    // Scoped lookup → 404 (not 403), so foreign IDs do not leak existence.
    $this->actingAs($user)->patchJson("/api/v1/recurring-payments/streams/{$stream->id}/restore")
        ->assertStatus(404);
});

test('force delete of another users stream returns 404 not 403', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $other->id]);
    $stream->delete();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}/force")
        ->assertStatus(404);
});

test('compare rejects non Y-m month formats', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet/compare?month_a=March&month_b=2026-04')
        ->assertStatus(422);
});
