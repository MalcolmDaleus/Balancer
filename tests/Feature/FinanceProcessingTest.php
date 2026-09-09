<?php

use App\Enums\IncomeEntryType;
use App\Enums\IncomeScheduleFrequency;
use App\Models\IncomeEntry;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\User;
use App\Services\FinanceProcessingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

afterEach(function () {
    Carbon::setTestNow();
    Cache::flush();
});

function seedMonthlyIncomeSchedule(User $user, string $startDate = '2026-01-01', float $amount = 1000.0): RegularIncomeSchedule
{
    $schedule = RegularIncomeSchedule::factory()->create([
        'user_id' => $user->id,
        'name' => 'Salary',
        'active' => true,
    ]);

    RegularIncomeScheduleVersion::factory()->create([
        'user_id' => $user->id,
        'regular_schedule_id' => $schedule->id,
        'amount' => $amount,
        'frequency' => IncomeScheduleFrequency::Monthly,
        'day_of_month' => 1,
        'start_date' => $startDate,
        'end_date' => null,
        'active' => true,
    ]);

    return $schedule;
}

test('finance:process-due generates income for a user idempotently', function () {
    // Generation horizon is as-of date → end of month (not past dates).
    Carbon::setTestNow('2026-06-01 12:00:00');

    $user = User::factory()->create();
    seedMonthlyIncomeSchedule($user);

    $this->artisan('finance:process-due', ['--user' => $user->id])
        ->assertSuccessful();

    expect(IncomeEntry::where('user_id', $user->id)->count())->toBe(1);
    expect(IncomeEntry::where('user_id', $user->id)->first()->type)->toBe(IncomeEntryType::Regular);
    expect($user->fresh()->last_finance_processed_at)->not->toBeNull();

    Cache::flush();

    $this->artisan('finance:process-due', ['--user' => $user->id])
        ->assertSuccessful();

    expect(IncomeEntry::where('user_id', $user->id)->count())->toBe(1);
});

test('finance:sync runs process-due and close-months for one user', function () {
    Carbon::setTestNow('2026-07-05 12:00:00');

    $user = User::factory()->create(['created_at' => '2026-05-01']);
    seedMonthlyIncomeSchedule($user, '2026-05-01');

    // Activity in June so backlog can close June when as-of is July.
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'name' => 'Bonus',
        'amount' => 50,
        'received_at' => '2026-06-10',
    ]);

    $this->artisan('finance:sync', ['--user' => $user->id])
        ->assertSuccessful();

    expect($user->fresh()->last_finance_processed_at)->not->toBeNull();
    expect(
        \App\Models\BalanceSheetTotal::where('user_id', $user->id)
            ->whereDate('month', '2026-06-01')
            ->exists()
    )->toBeTrue();
});

test('finance:process-due --user processes only that user', function () {
    Carbon::setTestNow('2026-06-01 12:00:00');

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMonthlyIncomeSchedule($userA);
    seedMonthlyIncomeSchedule($userB);

    $this->artisan('finance:process-due', ['--user' => $userA->id])
        ->assertSuccessful();

    expect(IncomeEntry::where('user_id', $userA->id)->where('type', IncomeEntryType::Regular)->count())->toBe(1);
    expect(IncomeEntry::where('user_id', $userB->id)->where('type', IncomeEntryType::Regular)->count())->toBe(0);
});

test('dual syncUser calls do not duplicate income entries', function () {
    Carbon::setTestNow('2026-06-01 12:00:00');

    $user = User::factory()->create();
    seedMonthlyIncomeSchedule($user);

    $finance = app(FinanceProcessingService::class);

    $finance->syncUser($user->id);
    Cache::flush();
    $finance->syncUser($user->id);

    expect(
        IncomeEntry::where('user_id', $user->id)
            ->where('type', IncomeEntryType::Regular)
            ->whereDate('received_at', '2026-06-01')
            ->count()
    )->toBe(1);
});

test('api finance sync requires auth and processes the current user', function () {
    Carbon::setTestNow('2026-06-01 12:00:00');

    $user = User::factory()->create();
    seedMonthlyIncomeSchedule($user);

    $this->postJson('/api/v1/finance/sync')->assertStatus(401);

    $this->actingAs($user)->postJson('/api/v1/finance/sync')
        ->assertOk()
        ->assertJsonPath('skipped', false);

    expect(IncomeEntry::where('user_id', $user->id)->count())->toBe(1);
    expect($user->fresh()->last_finance_processed_at)->not->toBeNull();
});

test('income generation ignores unique constraint races', function () {
    Carbon::setTestNow('2026-06-01 12:00:00');

    $user = User::factory()->create();
    $schedule = seedMonthlyIncomeSchedule($user);
    $version = $schedule->versions()->first();

    IncomeEntry::create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'name' => 'Salary',
        'amount' => 1000,
        'received_at' => '2026-06-01',
        'regular_schedule_id' => $schedule->id,
        'regular_schedule_version_id' => $version->id,
    ]);

    app(\App\Services\RegularIncomeGenerationService::class)->generateForUser($user->id);

    expect(
        IncomeEntry::where('regular_schedule_version_id', $version->id)
            ->whereDate('received_at', '2026-06-01')
            ->count()
    )->toBe(1);
});
