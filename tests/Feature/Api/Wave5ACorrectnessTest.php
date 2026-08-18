<?php

use App\Enums\IncomeScheduleFrequency;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\User;
use Carbon\Carbon;

afterEach(function () {
    Carbon::setTestNow();
});

test('balance sheet expanded rejects invalid month format', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet?month=March')
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed')
        ->assertJsonStructure(['details' => ['month']]);
});

test('balance sheet summary rejects invalid month format', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet/summary?month=not-a-month')
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('balance sheet expanded accepts Y-m month', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet?month=2026-04')
        ->assertSuccessful();
});

test('updating schedule to biweekly requires anchor_date', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);
    RegularIncomeScheduleVersion::factory()->create([
        'user_id'             => $user->id,
        'regular_schedule_id' => $schedule->id,
        'frequency'           => IncomeScheduleFrequency::Monthly,
        'day_of_month'        => 1,
        'end_date'            => null,
    ]);

    $this->actingAs($user)->postJson("/api/v1/income/schedules/{$schedule->id}/update-amount", [
        'amount'     => 100,
        'start_date' => '2026-04-01',
        'frequency'  => IncomeScheduleFrequency::Biweekly->value,
        'day_of_week'=> 1,
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed')
      ->assertJsonStructure(['details' => ['anchor_date']]);
});

test('updating schedule to biweekly succeeds with anchor_date', function () {
    $user = User::factory()->create();
    $schedule = RegularIncomeSchedule::factory()->create(['user_id' => $user->id]);
    RegularIncomeScheduleVersion::factory()->create([
        'user_id'             => $user->id,
        'regular_schedule_id' => $schedule->id,
        'frequency'           => IncomeScheduleFrequency::Monthly,
        'day_of_month'        => 1,
        'end_date'            => null,
    ]);

    $this->actingAs($user)->postJson("/api/v1/income/schedules/{$schedule->id}/update-amount", [
        'amount'      => 100,
        'start_date'  => '2026-04-01',
        'frequency'   => IncomeScheduleFrequency::Biweekly->value,
        'day_of_week' => 1,
        'anchor_date' => '2026-04-01',
    ])->assertSuccessful();
});
