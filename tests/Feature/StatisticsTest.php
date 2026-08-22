<?php

use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringCharge;
use App\Models\RecurringPaymentStream;
use App\Models\Saving;
use App\Models\User;
use App\Services\BalanceSheetService;
use App\Services\StatisticsService;
use Carbon\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-08-15 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function seedStatsFixture(User $user): PurchaseCategory
{
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Groceries']);
    $misc = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Miscellaneous']);

    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'name' => 'Salary',
        'amount' => 2000,
        'received_at' => '2026-08-01',
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Regular,
        'name' => 'Salary',
        'amount' => 2000,
        'received_at' => '2026-07-01',
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'name' => 'Gift',
        'amount' => 100,
        'received_at' => '2026-08-10',
    ]);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'description' => 'Lidl',
        'amount' => 80,
        'date' => '2026-08-05',
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'description' => 'Lidl',
        'amount' => 70,
        'date' => '2026-07-05',
    ]);

    $headphones = Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $misc->id,
        'description' => 'Headphones',
        'amount' => 50,
        'date' => '2026-07-20',
        'is_refunded' => true,
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Refund,
        'name' => 'Refund',
        'amount' => 50,
        'received_at' => '2026-08-03',
        'purchase_id' => $headphones->id,
    ]);

    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-07-01', 'amount' => 100])
        ->create(['user_id' => $user->id, 'name' => 'Rent']);
    RecurringCharge::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $stream->entries()->first()->id,
        'occurred_on' => '2026-08-01',
        'amount' => 100,
        'stream_name' => 'Rent',
    ]);
    RecurringCharge::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $stream->entries()->first()->id,
        'occurred_on' => '2026-07-01',
        'amount' => 100,
        'stream_name' => 'Rent',
    ]);

    Saving::factory()->create([
        'user_id' => $user->id,
        'type' => 'deposit',
        'amount' => 200,
        'month' => '2026-08-01',
    ]);
    Saving::factory()->create([
        'user_id' => $user->id,
        'type' => 'deposit',
        'amount' => 150,
        'month' => '2026-07-01',
    ]);

    (new BalanceSheetService($user->id, '2026-07'))->persistSnapshot();

    return $food;
}

test('guests cannot read statistics', function () {
    $this->getJson('/api/v1/statistics?view=trend&series=leftover')->assertStatus(401);
});

test('series requires a matching view and series', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/statistics?view=trend&series=outflow_mix')
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('leftover trend includes each month in the window', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'trend', 'leftover', 6);

    expect($payload['view'])->toBe('trend')
        ->and($payload['series'])->toBe('leftover')
        ->and($payload['from'])->toBe('2026-03')
        ->and($payload['to'])->toBe('2026-08')
        ->and($payload['points'])->toHaveCount(6)
        ->and($payload['points'][5]['month'])->toBe('2026-08');
});

test('spend_net subtracts refunds from the purchase month', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'trend', 'spend_net', 6);
    $byMonth = collect($payload['points'])->keyBy('month');

    expect($byMonth['2026-08']['value'])->toBe(80.0)
        ->and($byMonth['2026-07']['value'])->toBe(70.0);
});

test('purchase category share uses net spend', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'share', 'purchase_categories', 1);
    $byName = collect($payload['points'])->keyBy('name');

    expect($byName->has('Groceries'))->toBeTrue()
        ->and($byName['Groceries']['value'])->toBe(80.0)
        ->and($byName->has('Miscellaneous'))->toBeFalse();
});

test('outflow mix keeps domain labels', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'share', 'outflow_mix', 1);
    $names = collect($payload['points'])->pluck('name');

    expect($names)->toContain('Purchases')
        ->and($names)->toContain('Recurring')
        ->and($names)->toContain('Savings deposits')
        ->and($names)->not->toContain('spending');
});

test('income mix splits regular irregular and refund', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'share', 'income_mix', 1);
    $byName = collect($payload['points'])->keyBy('name');

    expect($byName['Regular']['value'])->toBe(2000.0)
        ->and($byName['Irregular']['value'])->toBe(100.0)
        ->and($byName['Refund']['value'])->toBe(50.0);
});

test('recurring load is recurring over income', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->series($user->id, 'trend', 'recurring_load', 1);
    $aug = $payload['points'][0]['value'];

    expect($payload['unit'])->toBe('percent')
        ->and($aug)->toBe(round(100 / 2150, 4));
});

test('markers include leftover delta and top category', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $payload = app(StatisticsService::class)->markers($user->id, 6);
    $ids = collect($payload['markers'])->pluck('id');

    expect($ids)->toContain('leftover_vs_avg')
        ->and($ids)->toContain('top_category')
        ->and($ids)->toContain('savings_this_month')
        ->and($ids)->toContain('recurring_load')
        ->and($ids)->toContain('best_leftover_month')
        ->and($ids)->toContain('worst_leftover_month');

    $top = collect($payload['markers'])->firstWhere('id', 'top_category');
    expect($top['name'])->toBe('Groceries');
});

test('authenticated users can fetch series and markers', function () {
    $user = User::factory()->create();
    seedStatsFixture($user);

    $this->actingAs($user)
        ->getJson('/api/v1/statistics?view=trend&series=leftover&window=6')
        ->assertOk()
        ->assertJsonPath('series', 'leftover')
        ->assertJsonPath('window', 6);

    $this->actingAs($user)
        ->getJson('/api/v1/statistics/markers?window=6')
        ->assertOk()
        ->assertJsonPath('window', 6)
        ->assertJsonStructure(['markers']);
});
