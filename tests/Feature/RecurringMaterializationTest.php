<?php

use App\Models\Purchase;
use App\Models\RecurringCharge;
use App\Models\RecurringOccurrenceSkip;
use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use App\Services\BalanceSheetService;
use App\Services\FinanceProcessingService;
use App\Services\RecurringPaymentMaterializationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

afterEach(function () {
    Carbon::setTestNow();
    Cache::flush();
});

function seedActiveMonthlyStream(User $user, array $entryOverrides = []): array
{
    $category = RecurringPaymentCategory::factory()->create([
        'user_id' => $user->id,
        'name'    => 'Subscriptions',
    ]);

    $stream = RecurringPaymentStream::factory()->create([
        'user_id'                       => $user->id,
        'recurring_payment_category_id' => $category->id,
        'name'                          => 'Netflix',
        'active'                        => true,
        'pending_active'                => null,
    ]);

    $entry = RecurringPaymentEntry::factory()->create(array_merge([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'amount'                      => 15.99,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
        'active'                      => true,
    ], $entryOverrides));

    return compact('category', 'stream', 'entry');
}

test('process-due materializes a recurring charge Fact through month end', function () {
    Carbon::setTestNow('2026-06-10 12:00:00');

    $user = User::factory()->create();
    seedActiveMonthlyStream($user);

    app(FinanceProcessingService::class)->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);

    $charge = RecurringCharge::where('user_id', $user->id)->first();
    expect((float) $charge->amount)->toBe(15.99);
    expect($charge->stream_name)->toBe('Netflix');
    expect($charge->occurred_on->toDateString())->toBe('2026-06-15');
    expect(Purchase::where('user_id', $user->id)->count())->toBe(0);
});

test('materialization is idempotent across process-due runs', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();
    seedActiveMonthlyStream($user);

    $finance = app(FinanceProcessingService::class);
    $finance->processDueForUser($user->id);
    Cache::flush();
    $finance->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);
});

test('charge then pause on occurrence day', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();
    ['stream' => $stream] = seedActiveMonthlyStream($user);
    $stream->update(['pending_active' => false]);

    app(FinanceProcessingService::class)->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);

    $stream->refresh();
    expect($stream->active)->toBeFalse();
    expect($stream->pending_active)->toBeNull();
});

test('deleted recurring charge is not recreated (skip)', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();
    seedActiveMonthlyStream($user);

    $finance = app(FinanceProcessingService::class);
    $finance->processDueForUser($user->id);

    $charge = RecurringCharge::where('user_id', $user->id)->first();

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/charges/{$charge->id}")
        ->assertNoContent();

    expect(RecurringOccurrenceSkip::count())->toBe(1);

    Cache::flush();
    $finance->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(0);
});

test('balance sheet: charged Facts vs projected; spending is one-off only', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();
    seedActiveMonthlyStream($user, [
        'day_of_month' => 15,
        'amount'       => 20.00,
    ]);

    // Second monthly stream — also month-ahead materialized after process-due.
    $cat = RecurringPaymentCategory::factory()->create(['user_id' => $user->id, 'name' => 'Utilities']);
    $stream2 = RecurringPaymentStream::factory()->create([
        'user_id'                       => $user->id,
        'recurring_payment_category_id' => $cat->id,
        'name'                          => 'Power',
        'active'                        => true,
    ]);
    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream2->id,
        'amount'                      => 50.00,
        'frequency'                   => 'monthly',
        'day_of_month'                => 28,
        'start_date'                  => '2026-01-28',
        'active'                      => true,
    ]);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'amount'  => 12.00,
        'date'    => '2026-06-10',
    ]);

    // Before sync: today's (15th) charge is not projected; day-28 still is.
    $before = (new BalanceSheetService($user->id, '2026-06'))->getExpanded();
    expect($before['recurring_payments']['charged_total'])->toBe(0.0);
    expect($before['recurring_payments']['projected_total'])->toBe(50.0);

    app(FinanceProcessingService::class)->processDueForUser($user->id);

    $expanded = (new BalanceSheetService($user->id, '2026-06'))->getExpanded();
    $simple = (new BalanceSheetService($user->id, '2026-06'))->getSimplified();

    expect($simple['total_recurring'])->toBe(70.0);
    expect($simple['total_spending'])->toBe(12.0);
    expect($expanded['recurring_payments']['charged_total'])->toBe(70.0);
    expect($expanded['recurring_payments']['projected_total'])->toBe(0.0);
    expect($expanded['spending']['total'])->toBe(12.0);
});

test('deactivation removes future open-month Facts', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();
    ['stream' => $stream] = seedActiveMonthlyStream($user, [
        'day_of_month' => 28,
        'amount'       => 40.00,
        'start_date'   => '2026-01-28',
    ]);

    app(FinanceProcessingService::class)->processDueForUser($user->id);
    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);
    expect(RecurringCharge::first()->occurred_on->toDateString())->toBe('2026-06-28');

    app(RecurringPaymentMaterializationService::class)
        ->removeFutureChargesForStream($stream, Carbon::parse('2026-06-15'));

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(0);
});

test('yearly charge only materializes in anniversary month', function () {
    Carbon::setTestNow('2026-03-10 12:00:00');

    $user = User::factory()->create();
    seedActiveMonthlyStream($user, [
        'frequency'    => 'yearly',
        'amount'       => 120.00,
        'day_of_month' => 10,
        'start_date'   => '2025-03-10',
    ]);

    app(FinanceProcessingService::class)->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);

    Carbon::setTestNow('2026-04-10 12:00:00');
    Cache::flush();
    app(FinanceProcessingService::class)->processDueForUser($user->id);

    expect(RecurringCharge::where('user_id', $user->id)->count())->toBe(1);
});
