<?php

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\IncomeEntry;
use App\Models\RegularIncomeSchedule;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access income schedules', function () {
    $this->getJson('/api/v1/income/schedules')->assertStatus(401);
});

test('unauthenticated user cannot access income entries', function () {
    $this->getJson('/api/v1/income/entries')->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Regular income schedules
// ---------------------------------------------------------------------------

test('user can list their income schedules', function () {
    $user = User::factory()->create();
    RegularIncomeSchedule::factory()->count(3)->create(['user_id' => $user->id]);
    RegularIncomeSchedule::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/income/schedules')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('user can create an income schedule with initial version', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/income/schedules', [
        'name'         => 'Salary',
        'amount'       => 3500.00,
        'frequency'    => 'monthly',
        'day_of_month' => 1,
        'start_date'   => '2026-04-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Salary')
        ->assertJsonPath('data.user_id', $user->id)
        ->assertJsonCount(1, 'data.versions');

    $this->assertDatabaseHas('regular_income_schedule_versions', [
        'amount'    => 3500,
        'frequency' => 'monthly',
    ]);
});

test('store income schedule fails without name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/income/schedules', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('user can view their income schedule', function () {
    $user     = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/income/schedules/{$schedule->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $schedule->id);
});

test('user cannot view another user\'s income schedule', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/income/schedules/{$schedule->id}")
        ->assertStatus(403);
});

test('user can update their income schedule', function () {
    $user     = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id, 'name' => 'Old']);

    $this->actingAs($user)->putJson("/api/v1/income/schedules/{$schedule->id}", [
        'name' => 'New Name',
    ])->assertOk()->assertJsonPath('data.name', 'New Name');
});

test('schedule rename propagates to open-month regular entries', function () {
    $user     = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()
        ->withActiveVersion()
        ->create(['user_id' => $user->id, 'name' => 'Old Name']);
    $version  = $schedule->versions()->first();

    $openEntry = IncomeEntry::factory()->create([
        'user_id'                     => $user->id,
        'type'                        => IncomeEntryType::Regular,
        'name'                        => 'Old Name',
        'regular_schedule_id'         => $schedule->id,
        'regular_schedule_version_id' => $version->id,
        'received_at'                 => '2026-06-15',
    ]);

    $lockedEntry = IncomeEntry::factory()->create([
        'user_id'                     => $user->id,
        'type'                        => IncomeEntryType::Regular,
        'name'                        => 'Old Name',
        'regular_schedule_id'         => $schedule->id,
        'regular_schedule_version_id' => $version->id,
        'received_at'                 => '2026-05-15',
    ]);

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

    $this->actingAs($user)->putJson("/api/v1/income/schedules/{$schedule->id}", [
        'name' => 'New Name',
    ])->assertOk();

    expect($openEntry->fresh()->name)->toBe('New Name');
    expect($lockedEntry->fresh()->name)->toBe('Old Name');
});

test('user can archive their income schedule', function () {
    $user     = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/income/schedules/{$schedule->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('regular_income_schedules', ['id' => $schedule->id]);
});

// ---------------------------------------------------------------------------
// Income Entries
// ---------------------------------------------------------------------------

test('user can list their income entries', function () {
    $user = User::factory()->create();
    IncomeEntry::factory()->count(2)->create(['user_id' => $user->id]);
    IncomeEntry::factory()->count(3)->create();

    $this->actingAs($user)->getJson('/api/v1/income/entries')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can create an irregular income entry', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'type'        => 'irregular',
        'name'        => 'Consulting gig',
        'amount'      => 3500.00,
        'received_at' => '2026-04-15',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.type', 'irregular')
        ->assertJsonPath('data.name', 'Consulting gig');
    $this->assertEquals(3500, $response->json('data.amount'));
});

test('user can create a manual regular income entry', function () {
    $user     = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'type'                => 'regular',
        'name'                => 'Bonus paycheck',
        'amount'              => 1000.00,
        'received_at'         => '2026-04-20',
        'regular_schedule_id' => $schedule->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.type', 'regular')
        ->assertJsonPath('data.regular_schedule_id', $schedule->id);
});

test('store income entry rejects schedule belonging to another user', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'type'                => 'regular',
        'name'                => 'Test',
        'amount'              => 1000.00,
        'received_at'         => '2026-04-01',
        'regular_schedule_id' => $schedule->id,
    ])->assertStatus(422);
});

test('user can view their income entry', function () {
    $user  = User::factory()->create();
    $entry = IncomeEntry::factory()->create(['user_id' => $user->id]);

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

    $this->actingAs($user)->postJson('/api/v1/income/entries', [
        'type'        => 'irregular',
        'name'        => 'Locked',
        'amount'      => 1000.00,
        'received_at' => '2026-03-15',
    ])->assertStatus(423)
      ->assertJsonPath('error', 'month_locked');
});
