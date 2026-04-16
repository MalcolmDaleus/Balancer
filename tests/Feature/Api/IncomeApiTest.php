<?php

use App\Models\BalanceSheetTotal;
use App\Models\IncomeCategory;
use App\Models\IncomeEntry;
use App\Models\IncomeStream;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access income streams', function () {
    $this->getJson('/api/v1/income/streams')->assertStatus(401);
});

test('unauthenticated user cannot access income entries', function () {
    $this->getJson('/api/v1/income/entries')->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Income Streams
// ---------------------------------------------------------------------------

test('user can list their income streams', function () {
    $user = User::factory()->create();
    IncomeStream::factory()->count(3)->create(['user_id' => $user->id]);
    IncomeStream::factory()->count(2)->create(); // other user

    $this->actingAs($user)->getJson('/api/v1/income/streams')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user can create an income stream', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/income/streams', [
        'name' => 'Salary',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Salary')
        ->assertJsonPath('data.user_id', $user->id);
});

test('store income stream fails without name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/income/streams', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('user can view their income stream', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/income/streams/{$stream->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $stream->id);
});

test('user cannot view another user\'s income stream', function () {
    $user   = User::factory()->create();
    $other  = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/income/streams/{$stream->id}")
        ->assertStatus(403);
});

test('user can update their income stream', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id, 'name' => 'Old']);

    $this->actingAs($user)->putJson("/api/v1/income/streams/{$stream->id}", [
        'name' => 'New Name',
    ])->assertOk()->assertJsonPath('data.name', 'New Name');
});

test('user can delete their income stream', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/income/streams/{$stream->id}")
        ->assertNoContent();
});

// ---------------------------------------------------------------------------
// Income Entries
// ---------------------------------------------------------------------------

test('user can list their income entries', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);
    IncomeEntry::factory()->count(2)->create(['user_id' => $user->id, 'income_stream_id' => $stream->id]);
    IncomeEntry::factory()->count(3)->create(); // other user

    $this->actingAs($user)->getJson('/api/v1/income/entries')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can create an income entry', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'income_stream_id' => $stream->id,
        'amount'           => 3500.00,
        'month'            => '2026-04',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.income_stream_id', $stream->id);
    $this->assertEquals(3500, $response->json('data.amount'));
});

test('store income entry normalises YYYY-MM month format', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'income_stream_id' => $stream->id,
        'amount'           => 1000.00,
        'month'            => '2026-04',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.month', '2026-04-01');
});

test('store income entry rejects stream belonging to another user', function () {
    $user   = User::factory()->create();
    $other  = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'income_stream_id' => $stream->id,
        'amount'           => 1000.00,
        'month'            => '2026-04-01',
    ])->assertStatus(422);
});

test('user can view their income entry', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);
    $entry  = IncomeEntry::factory()->create(['user_id' => $user->id, 'income_stream_id' => $stream->id]);

    $this->actingAs($user)->getJson("/api/v1/income/entries/{$entry->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $entry->id);
});

test('user cannot view another user\'s income entry', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $entry = IncomeEntry::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/income/entries/{$entry->id}")
        ->assertStatus(403);
});

test('income entry on locked month returns 423', function () {
    $user   = User::factory()->create();
    $stream = IncomeStream::factory()->create(['user_id' => $user->id]);

    BalanceSheetTotal::create([
        'user_id'          => $user->id,
        'month'            => '2026-03-01',
        'total_income'     => 0,
        'total_debt_paid'  => 0,
        'total_spending'   => 0,
        'savings_snapshot' => 0,
        'roll_over'        => 0,
    ]);

    $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'income_stream_id' => $stream->id,
        'amount'           => 1000.00,
        'month'            => '2026-03-01',
    ])->assertStatus(423)
      ->assertJsonPath('error', 'month_locked');
});
