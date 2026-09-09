<?php

use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ===========================================================================
// Categories
// ===========================================================================

test('unauthenticated user cannot access recurring payment categories', function () {
    $this->getJson('/api/v1/recurring-payments/categories')->assertStatus(401);
});

test('user can list their recurring payment categories', function () {
    $user = User::factory()->create();
    RecurringPaymentCategory::factory()->count(3)->create(['user_id' => $user->id]);
    RecurringPaymentCategory::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/categories')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user can create a recurring payment category', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/categories', ['name' => 'Streaming'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Streaming');
});

test('creating a category with same name as soft-deleted one restores it', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id, 'name' => 'Streaming']);
    $cat->delete();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/categories', ['name' => 'Streaming'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Streaming');

    $this->assertNull($cat->fresh()->deleted_at);
});

test('user can update a recurring payment category', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/categories/{$cat->id}", ['name' => 'Updated'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated');
});

test('category is soft-deleted when streams reference it', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);
    RecurringPaymentStream::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_category_id' => $cat->id,
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/categories/{$cat->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_categories', ['id' => $cat->id]);
});

test('category is hard-deleted when no streams reference it', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/categories/{$cat->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('recurring_payment_categories', ['id' => $cat->id]);
});

// ===========================================================================
// Streams
// ===========================================================================

test('user can list their recurring payment streams', function () {
    $user = User::factory()->create();
    RecurringPaymentStream::factory()->count(2)->create(['user_id' => $user->id]);
    RecurringPaymentStream::factory()->count(3)->create();

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can create a recurring payment stream with initial price entry', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/streams', [
        'name' => 'Netflix',
        'recurring_payment_category_id' => $cat->id,
        'amount_cents' => 1599,
        'frequency' => 'monthly',
        'day_of_month' => 1,
        'start_date' => '2026-01-01',
    ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Netflix')
        ->assertJsonPath('data.active', true)
        ->assertJsonCount(1, 'data.entries')
        ->assertJsonPath('data.entries.0.amount_cents', 1599)
        ->assertJsonPath('data.entries.0.frequency', 'monthly');

    $this->assertDatabaseHas('recurring_payment_entries', [
        'user_id' => $user->id,
        'amount' => 15.99,
    ]);
});

test('creating a stream without a category fails validation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/streams', [
        'name' => 'Netflix',
        'amount_cents' => 1599,
        'frequency' => 'monthly',
        'day_of_month' => 1,
        'start_date' => '2026-01-01',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('creating a stream without price fields fails validation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/streams', ['name' => 'Netflix'])
        ->assertStatus(422);
});

test('user cannot view another user\'s stream', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/recurring-payments/streams/{$stream->id}")
        ->assertStatus(403);
});

test('stream delete (archive) is always a soft delete', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_streams', ['id' => $stream->id]);
});

test('new streams default to active=true', function () {
    $user = User::factory()->create();
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/streams', [
        'name' => 'Spotify',
        'recurring_payment_category_id' => $cat->id,
        'amount_cents' => 999,
        'frequency' => 'monthly',
        'day_of_month' => 15,
        'start_date' => '2026-01-01',
    ])
        ->assertCreated()
        ->assertJsonPath('data.active', true);
});

test('toggle queues a pending_active change without touching live active', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id, 'active' => true, 'pending_active' => null]);

    // First toggle: queues a pause (pending_active = false), live active stays true
    $this->actingAs($user)->patchJson("/api/v1/recurring-payments/streams/{$stream->id}/toggle")
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.pending_active', false);

    $stream->refresh();
    expect($stream->active)->toBeTrue();
    expect($stream->pending_active)->toBeFalse();
});

test('toggle again cancels the pending change', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create([
        'user_id' => $user->id,
        'active' => true,
        'pending_active' => false,
    ]);

    // Second toggle: cancels the pending pause
    $this->actingAs($user)->patchJson("/api/v1/recurring-payments/streams/{$stream->id}/toggle")
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.pending_active', null);

    $stream->refresh();
    expect($stream->active)->toBeTrue();
    expect($stream->pending_active)->toBeNull();
});

test('update-price does not mutate another user\'s recurring entries', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $streamA = RecurringPaymentStream::factory()->create(['user_id' => $userA->id]);
    $streamB = RecurringPaymentStream::factory()->create(['user_id' => $userB->id]);

    $entryA = RecurringPaymentEntry::factory()->create([
        'user_id' => $userA->id,
        'recurring_payment_stream_id' => $streamA->id,
        'amount' => 10.00,
        'frequency' => 'monthly',
        'day_of_month' => 1,
        'start_date' => '2026-01-01',
        'end_date' => null,
        'active' => true,
    ]);

    // Open-ended active entry for another tenant — must remain untouched.
    $entryB = RecurringPaymentEntry::factory()->create([
        'user_id' => $userB->id,
        'recurring_payment_stream_id' => $streamB->id,
        'amount' => 50.00,
        'frequency' => 'monthly',
        'day_of_month' => 15,
        'start_date' => '2026-01-01',
        'end_date' => null,
        'active' => true,
    ]);

    // Entry with end_date still in range — exercises the OR branch that used to
    // escape the stream_id constraint before the query was grouped.
    $entryBOpenEnded = RecurringPaymentEntry::factory()->create([
        'user_id' => $userB->id,
        'recurring_payment_stream_id' => $streamB->id,
        'amount' => 25.00,
        'frequency' => 'monthly',
        'day_of_month' => 20,
        'start_date' => '2025-06-01',
        'end_date' => '2026-12-31',
        'active' => true,
    ]);

    $this->actingAs($userA)->postJson(
        "/api/v1/recurring-payments/streams/{$streamA->id}/update-price",
        [
            'amount_cents' => 1200,
            'start_date' => '2026-07-01',
            'frequency' => 'monthly',
            'day_of_month' => 1,
        ]
    )->assertOk();

    $entryA->refresh();
    expect($entryA->active)->toBeFalse();
    expect($entryA->end_date?->toDateString())->toBe('2026-06-30');

    $entryB->refresh();
    expect($entryB->active)->toBeTrue();
    expect($entryB->end_date)->toBeNull();
    expect((float) $entryB->amount)->toBe(50.00);

    $entryBOpenEnded->refresh();
    expect($entryBOpenEnded->active)->toBeTrue();
    expect($entryBOpenEnded->end_date?->toDateString())->toBe('2026-12-31');
    expect((float) $entryBOpenEnded->amount)->toBe(25.00);

    expect(
        RecurringPaymentEntry::where('recurring_payment_stream_id', $streamA->id)
            ->where('active', true)
            ->whereNull('end_date')
            ->where('amount', 12.00)
            ->exists()
    )->toBeTrue();
});

test('user cannot toggle another user\'s stream', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->patchJson("/api/v1/recurring-payments/streams/{$stream->id}/toggle")
        ->assertStatus(403);
});

test('archived streams appear in ?archived=1 listing only', function () {
    $user = User::factory()->create();
    RecurringPaymentStream::factory()->count(2)->create(['user_id' => $user->id]);
    $archived = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);
    $archived->delete();

    // Normal listing excludes archived
    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    // Archive listing includes only archived
    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams?archived=1')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('user can restore an archived stream', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);
    $stream->delete();

    $this->actingAs($user)->patchJson("/api/v1/recurring-payments/streams/{$stream->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.name', $stream->name);

    $this->assertNull($stream->fresh()->deleted_at);
});

test('hard delete is allowed when stream has no locked-month entries', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);
    $stream->delete();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}/force")
        ->assertNoContent();

    $this->assertDatabaseMissing('recurring_payment_streams', ['id' => $stream->id]);
});

test('hard delete is blocked when stream has entries in a locked month', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);
    RecurringPaymentEntry::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'start_date' => '2026-01-01',
        'active' => true,
    ]);
    // Close January
    \App\Models\BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-01-01',
    ]);
    $stream->delete();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}/force")
        ->assertStatus(423);

    $this->assertSoftDeleted('recurring_payment_streams', ['id' => $stream->id]);
});

// ===========================================================================
// Entries
// ===========================================================================

test('user can create a monthly recurring payment entry', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 1499,
        'frequency' => 'monthly',
        'day_of_month' => 15,
        'start_date' => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.amount_cents', 1499)
        ->assertJsonPath('data.frequency', 'monthly')
        ->assertJsonPath('data.day_of_month', 15);
});

test('user can create a yearly recurring payment entry', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 9900,
        'frequency' => 'yearly',
        'day_of_month' => 1,
        'start_date' => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.frequency', 'yearly')
        ->assertJsonPath('data.day_of_month', 1);
});

test('user can create a weekly recurring payment entry', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 500,
        'frequency' => 'weekly',
        'day_of_week' => 1,
        'start_date' => '2026-01-01',
    ])->assertCreated()
        ->assertJsonPath('data.frequency', 'weekly')
        ->assertJsonPath('data.day_of_week', 1);
});

test('weekly entry requires day_of_week', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 500,
        'frequency' => 'weekly',
        'start_date' => '2026-01-01',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('monthly entry requires day_of_month', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 999,
        'frequency' => 'monthly',
        'start_date' => '2026-01-01',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('entry store fails with invalid frequency', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount_cents' => 1000,
        'frequency' => 'daily',
        'start_date' => '2026-01-01',
    ])->assertStatus(422);
});

test('update frequency to monthly without day_of_month is rejected', function () {
    $user = User::factory()->create();
    // Create a yearly entry with no day_of_month to simulate the missing field scenario
    $entry = RecurringPaymentEntry::factory()->yearly()->create(['user_id' => $user->id, 'day_of_month' => null]);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/entries/{$entry->id}", [
        'frequency' => 'monthly',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('entry delete sets active=false and soft-deletes the record', function () {
    $user = User::factory()->create();
    $entry = RecurringPaymentEntry::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/entries/{$entry->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_entries', ['id' => $entry->id]);
    $this->assertEquals(false, $entry->fresh()->withTrashed()->find($entry->id)->active);
});

test('user cannot delete another user\'s entry', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $entry = RecurringPaymentEntry::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/entries/{$entry->id}")
        ->assertStatus(403);
});
