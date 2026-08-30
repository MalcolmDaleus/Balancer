<?php

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringCharge;
use App\Models\RecurringPaymentStream;
use App\Models\RegularIncomeSchedule;
use App\Models\User;

// ---------------------------------------------------------------------------
// W5.I1 — hardDestroy guards
// ---------------------------------------------------------------------------

test('stream hardDestroy with charges returns 422 has_facts', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-06-01'])
        ->create(['user_id' => $user->id]);
    $entry = $stream->entries()->first();
    RecurringCharge::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $entry->id,
        'occurred_on' => '2026-06-15',
    ]);
    $stream->delete();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}/force")
        ->assertStatus(422)
        ->assertJsonPath('error', 'has_facts');

    $this->assertSoftDeleted('recurring_payment_streams', ['id' => $stream->id]);
});

test('stream hardDestroy with locked history returns 423 locked_month', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry([
            'start_date' => '2026-01-01',
            'active' => true,
        ])
        ->create(['user_id' => $user->id]);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-01-01',
    ]);
    $stream->delete();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/streams/{$stream->id}/force")
        ->assertStatus(423)
        ->assertJsonPath('error', 'locked_month');

    $this->assertSoftDeleted('recurring_payment_streams', ['id' => $stream->id]);
});

test('schedule hardDestroy with locked history returns 423 locked_month', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'regular_schedule_id' => $schedule->id,
        'received_at' => '2026-01-15',
        'name' => $schedule->name,
    ]);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-01-01',
    ]);
    $schedule->delete();

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}/force")
        ->assertStatus(423)
        ->assertJsonPath('error', 'locked_month');

    $this->assertSoftDeleted('regular_income_schedules', ['id' => $schedule->id]);
});

test('schedule hardDestroy with income entries returns 422 has_facts', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'regular_schedule_id' => $schedule->id,
        'received_at' => '2026-06-15',
        'name' => $schedule->name,
    ]);
    $schedule->delete();

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}/force")
        ->assertStatus(422)
        ->assertJsonPath('error', 'has_facts');

    $this->assertSoftDeleted('regular_income_schedules', ['id' => $schedule->id]);
});

// ---------------------------------------------------------------------------
// W5.I2 — classifier rename lock
// ---------------------------------------------------------------------------

test('renaming purchase category used in locked month returns 423 classifier_locked', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create([
        'user_id' => $user->id,
        'name' => 'Food',
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'date' => '2026-01-10',
    ]);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-01-01',
    ]);

    $this->actingAs($user)->putJson("/api/v1/categories/purchases/{$category->id}", [
        'name' => 'Groceries',
    ])->assertStatus(423)
        ->assertJsonPath('error', 'classifier_locked');

    expect($category->fresh()->name)->toBe('Food');
});

// ---------------------------------------------------------------------------
// W5.I6 — schedule restore/force scoping + compare success
// ---------------------------------------------------------------------------

test('restore of another users income schedule returns 404 not 403', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $other->id]);
    $schedule->delete();

    $this->actingAs($user)->patchJson("/api/v1/income/schedules/{$schedule->id}/restore")
        ->assertStatus(404);
});

test('force-deleting an already deleted schedule returns a clean 404', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}/force")
        ->assertNoContent();

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}/force")
        ->assertNotFound()
        ->assertJsonPath('error', 'not_found')
        ->assertJsonPath('message', 'The requested resource was not found.')
        ->assertJsonMissing(['message' => "No query results for model [App\\Models\\RegularIncomeSchedule] {$schedule->id}"]);
});

test('force delete of another users income schedule returns 404 not 403', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $other->id]);
    $schedule->delete();

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}/force")
        ->assertStatus(404);
});

// ---------------------------------------------------------------------------
// can_hard_delete flags (same rules as force-delete guards)
// ---------------------------------------------------------------------------

test('schedule list marks unused schedules as can_hard_delete', function () {
    $user = User::factory()->create();
    RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson('/api/v1/income/schedules')
        ->assertOk()
        ->assertJsonPath('data.0.can_hard_delete', true);
});

test('schedule list marks schedules with income facts as not can_hard_delete', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'regular_schedule_id' => $schedule->id,
        'received_at' => '2026-06-15',
        'name' => $schedule->name,
    ]);

    $this->actingAs($user)->getJson('/api/v1/income/schedules')
        ->assertOk()
        ->assertJsonPath('data.0.can_hard_delete', false);
});

test('stream list marks unused streams as can_hard_delete', function () {
    $user = User::factory()->create();
    RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-08-01'])
        ->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams')
        ->assertOk()
        ->assertJsonPath('data.0.can_hard_delete', true);
});

test('stream list marks streams with charges as not can_hard_delete', function () {
    $user = User::factory()->create();
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-06-01'])
        ->create(['user_id' => $user->id]);
    $entry = $stream->entries()->first();
    RecurringCharge::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $entry->id,
        'occurred_on' => '2026-06-15',
    ]);

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams')
        ->assertOk()
        ->assertJsonPath('data.0.can_hard_delete', false);
});

test('stream list marks streams with locked-month entries as not can_hard_delete', function () {
    $user = User::factory()->create();
    RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-01-01'])
        ->create(['user_id' => $user->id]);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-01-01',
    ]);

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/streams')
        ->assertOk()
        ->assertJsonPath('data.0.can_hard_delete', false);
});

test('compare success path returns expected top-level keys', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet/compare?month_a=2026-03&month_b=2026-04')
        ->assertOk()
        ->assertJsonStructure(['income', 'debt', 'spending', 'recurring', 'savings', 'rollover']);
});
