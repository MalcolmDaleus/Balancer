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
    $cat  = RecurringPaymentCategory::factory()->create(['user_id' => $user->id, 'name' => 'Streaming']);
    $cat->delete();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/categories', ['name' => 'Streaming'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Streaming');

    $this->assertNull($cat->fresh()->deleted_at);
});

test('user can update a recurring payment category', function () {
    $user = User::factory()->create();
    $cat  = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/categories/{$cat->id}", ['name' => 'Updated'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated');
});

test('category is soft-deleted when streams reference it', function () {
    $user = User::factory()->create();
    $cat  = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);
    RecurringPaymentStream::factory()->create([
        'user_id'                       => $user->id,
        'recurring_payment_category_id' => $cat->id,
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/categories/{$cat->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_categories', ['id' => $cat->id]);
});

test('category is hard-deleted when no streams reference it', function () {
    $user = User::factory()->create();
    $cat  = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

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

test('user can create a recurring payment stream', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/streams', ['name' => 'Netflix'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Netflix');
});

test('user cannot view another user\'s stream', function () {
    $user   = User::factory()->create();
    $other  = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/recurring-payments/streams/{$stream->id}")
        ->assertStatus(403);
});

test('stream delete is always a soft delete', function () {
    $user   = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_streams', ['id' => $stream->id]);
});

// ===========================================================================
// Entries
// ===========================================================================

test('user can create a monthly recurring payment entry', function () {
    $user   = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount'                      => 14.99,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.amount', 14.99)
        ->assertJsonPath('data.frequency', 'monthly')
        ->assertJsonPath('data.day_of_month', 15);
});

test('user can create a weekly recurring payment entry', function () {
    $user   = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount'                      => 5.00,
        'frequency'                   => 'weekly',
        'day_of_week'                 => 1,
        'start_date'                  => '2026-01-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.frequency', 'weekly')
        ->assertJsonPath('data.day_of_week', 1);
});

test('monthly entry requires day_of_month', function () {
    $user   = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount'                      => 9.99,
        'frequency'                   => 'monthly',
        'start_date'                  => '2026-01-01',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('entry store fails with invalid frequency', function () {
    $user   = User::factory()->create();
    $stream = RecurringPaymentStream::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/recurring-payments/entries', [
        'recurring_payment_stream_id' => $stream->id,
        'amount'                      => 10.00,
        'frequency'                   => 'daily',
        'start_date'                  => '2026-01-01',
    ])->assertStatus(422);
});

test('update frequency to monthly without day_of_month is rejected', function () {
    $user  = User::factory()->create();
    $entry = RecurringPaymentEntry::factory()->weekly()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/entries/{$entry->id}", [
        'frequency' => 'monthly',
    ])->assertStatus(422)->assertJsonPath('error', 'validation_failed');
});

test('entry delete sets active=false and soft-deletes the record', function () {
    $user  = User::factory()->create();
    $entry = RecurringPaymentEntry::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/entries/{$entry->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('recurring_payment_entries', ['id' => $entry->id]);
    $this->assertEquals(false, $entry->fresh()->withTrashed()->find($entry->id)->active);
});

test('user cannot delete another user\'s entry', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $entry = RecurringPaymentEntry::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/entries/{$entry->id}")
        ->assertStatus(403);
});
