<?php

use App\Models\RecurringPurchase;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('unauthenticated user cannot access recurring purchases', function () {
    $this->getJson('/api/v1/recurring-purchases')->assertStatus(401);
});

test('user can list their recurring purchases', function () {
    $user = User::factory()->create();
    RecurringPurchase::factory()->count(3)->create(['user_id' => $user->id]);
    RecurringPurchase::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/recurring-purchases')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user can create a monthly recurring purchase', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-purchases', [
        'amount'       => 9.99,
        'description'  => 'Netflix',
        'frequency'    => 'monthly',
        'day_of_month' => 15,
        'start_date'   => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.description', 'Netflix')
        ->assertJsonPath('data.frequency', 'monthly')
        ->assertJsonPath('data.day_of_month', 15);
});

test('user can create a weekly recurring purchase', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-purchases', [
        'amount'      => 5.00,
        'description' => 'Coffee',
        'frequency'   => 'weekly',
        'day_of_week' => 1,
        'start_date'  => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.frequency', 'weekly')
        ->assertJsonPath('data.day_of_week', 1);
});

test('monthly recurring purchase requires day_of_month', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-purchases', [
        'amount'      => 9.99,
        'description' => 'Subscription',
        'frequency'   => 'monthly',
        'start_date'  => '2026-01-01',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('weekly recurring purchase requires day_of_week', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-purchases', [
        'amount'      => 5.00,
        'description' => 'Coffee',
        'frequency'   => 'weekly',
        'start_date'  => '2026-01-01',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('store recurring purchase fails with invalid frequency', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-purchases', [
        'amount'      => 10.00,
        'description' => 'Test',
        'frequency'   => 'daily',
        'start_date'  => '2026-01-01',
    ])->assertStatus(422);
});

test('user can view their recurring purchase', function () {
    $user = User::factory()->create();
    $rp   = RecurringPurchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/recurring-purchases/{$rp->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $rp->id);
});

test('user cannot view another user\'s recurring purchase', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $rp    = RecurringPurchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/recurring-purchases/{$rp->id}")
        ->assertStatus(403);
});

test('user can toggle active on their recurring purchase', function () {
    $user = User::factory()->create();
    $rp   = RecurringPurchase::factory()->create(['user_id' => $user->id, 'active' => true]);

    $this->actingAs($user)->putJson("/api/v1/recurring-purchases/{$rp->id}", [
        'active' => false,
    ])->assertOk()->assertJsonPath('data.active', false);
});

test('update frequency to monthly without day_of_month is rejected', function () {
    $user = User::factory()->create();
    $rp   = RecurringPurchase::factory()->create([
        'user_id'      => $user->id,
        'frequency'    => 'weekly',
        'day_of_week'  => 1,
        'day_of_month' => null,
    ]);

    $this->actingAs($user)->putJson("/api/v1/recurring-purchases/{$rp->id}", [
        'frequency' => 'monthly',
        // day_of_month intentionally omitted — should fail
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('update end_date accepts null to clear it', function () {
    $user = User::factory()->create();
    $rp   = RecurringPurchase::factory()->create([
        'user_id'  => $user->id,
        'end_date' => '2026-12-31',
    ]);

    $this->actingAs($user)->putJson("/api/v1/recurring-purchases/{$rp->id}", [
        'end_date' => null,
    ])->assertOk()->assertJsonPath('data.end_date', null);
});

test('user can delete their recurring purchase', function () {
    $user = User::factory()->create();
    $rp   = RecurringPurchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-purchases/{$rp->id}")
        ->assertNoContent();
});

test('user cannot delete another user\'s recurring purchase', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $rp    = RecurringPurchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-purchases/{$rp->id}")
        ->assertStatus(403);
});
