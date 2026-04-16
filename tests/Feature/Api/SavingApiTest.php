<?php

use App\Models\BalanceSheetTotal;
use App\Models\Saving;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('unauthenticated user cannot access savings', function () {
    $this->getJson('/api/v1/savings')->assertStatus(401);
});

test('user can list their savings', function () {
    $user = User::factory()->create();
    Saving::factory()->count(3)->create(['user_id' => $user->id]);
    Saving::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/savings')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user can create a saving', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/savings', [
        'amount' => 200.00,
        'month'  => '2026-04',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.month', '2026-04-01');
    $this->assertEquals(200, $response->json('data.amount'));
});

test('store saving fails without required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/savings', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('user can view their saving', function () {
    $user   = User::factory()->create();
    $saving = Saving::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/savings/{$saving->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $saving->id);
});

test('user cannot view another user\'s saving', function () {
    $user   = User::factory()->create();
    $other  = User::factory()->create();
    $saving = Saving::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/savings/{$saving->id}")
        ->assertStatus(403);
});

test('user can update their saving', function () {
    $user   = User::factory()->create();
    $saving = Saving::factory()->create(['user_id' => $user->id, 'amount' => 100]);

    $response = $this->actingAs($user)->putJson("/api/v1/savings/{$saving->id}", [
        'amount' => 250.00,
    ])->assertOk();
    $this->assertEquals(250, $response->json('data.amount'));
});

test('user cannot update another user\'s saving', function () {
    $user   = User::factory()->create();
    $other  = User::factory()->create();
    $saving = Saving::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->putJson("/api/v1/savings/{$saving->id}", [
        'amount' => 999.00,
    ])->assertStatus(403);
});

test('user can delete their saving', function () {
    $user   = User::factory()->create();
    $saving = Saving::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/savings/{$saving->id}")
        ->assertNoContent();
});

test('saving on locked month returns 423', function () {
    $user = User::factory()->create();

    BalanceSheetTotal::create([
        'user_id'          => $user->id,
        'month'            => '2026-03-01',
        'total_income'     => 0,
        'total_debt_paid'  => 0,
        'total_spending'   => 0,
        'savings_snapshot' => 0,
        'roll_over'        => 0,
    ]);

    $this->actingAs($user)->postJson('/api/v1/savings', [
        'amount' => 100.00,
        'month'  => '2026-03-01',
    ])->assertStatus(423)
      ->assertJsonPath('error', 'month_locked');
});
