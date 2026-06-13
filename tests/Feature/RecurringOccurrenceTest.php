<?php

use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use App\Services\BalanceSheetService;
use App\Services\OccurrenceCalculatorService;
use Carbon\Carbon;

test('monthly recurring entry counts once in its charge month', function () {
    $calculator = app(OccurrenceCalculatorService::class);

    $entry = RecurringPaymentEntry::factory()->create([
        'frequency'    => 'monthly',
        'amount'       => 49.99,
        'day_of_month' => 15,
        'start_date'   => '2026-01-15',
    ]);

    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-04-01', '2026-04-30'))->toBe(49.99);
    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-05-01', '2026-05-31'))->toBe(49.99);
});

test('yearly recurring entry only counts in its anniversary month', function () {
    $calculator = app(OccurrenceCalculatorService::class);

    $entry = RecurringPaymentEntry::factory()->create([
        'frequency'    => 'yearly',
        'amount'       => 1200.00,
        'day_of_month' => 10,
        'start_date'   => '2025-03-10',
    ]);

    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-03-01', '2026-03-31'))->toBe(1200.00);
    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-04-01', '2026-04-30'))->toBe(0.0);
    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-02-01', '2026-02-28'))->toBe(0.0);
});

test('weekly recurring entry counts each occurrence in the month', function () {
    $calculator = app(OccurrenceCalculatorService::class);

    // Every Monday starting 2026-04-06 (April 2026 has 4 Mondays from the 6th)
    $entry = RecurringPaymentEntry::factory()->weekly()->create([
        'amount'      => 10.00,
        'day_of_week' => Carbon::MONDAY,
        'start_date'  => '2026-04-06',
    ]);

    $dates = $calculator->recurringEntryDatesInPeriod($entry, '2026-04-01', '2026-04-30');

    expect($dates)->toHaveCount(4);
    expect($calculator->recurringEntryAmountInPeriod($entry, '2026-04-01', '2026-04-30'))->toBe(40.00);
});

test('balance sheet recurring total uses occurrence counts not flat entry amounts', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();

    $stream = RecurringPaymentStream::factory()->create([
        'user_id' => $user->id,
        'active'  => true,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'yearly',
        'amount'                      => 999.00,
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
    ]);

    // June — yearly charge is not due
    $june = (new BalanceSheetService($user->id, '2026-06'))->getSimplified();
    expect($june['total_recurring'])->toBe(0.0);

    // January — yearly charge is due
    $january = (new BalanceSheetService($user->id, '2026-01'))->getSimplified();
    expect($january['total_recurring'])->toBe(999.0);
});

test('paused recurring streams are excluded from balance sheet totals', function () {
    $user = User::factory()->create();

    $stream = RecurringPaymentStream::factory()->create([
        'user_id' => $user->id,
        'active'  => false,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'monthly',
        'amount'                      => 25.00,
        'day_of_month'                => 1,
        'start_date'                  => '2026-04-01',
    ]);

    $april = (new BalanceSheetService($user->id, '2026-04'))->getSimplified();
    expect($april['total_recurring'])->toBe(0.0);
});

test('pending_active flushes on a recurring occurrence day', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();

    $stream = RecurringPaymentStream::factory()->create([
        'user_id'        => $user->id,
        'active'         => true,
        'pending_active' => false,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
    ]);

    app(\App\Services\RecurringPaymentCycleService::class)->processForUser($user->id);

    $stream->refresh();
    expect($stream->active)->toBeFalse();
    expect($stream->pending_active)->toBeNull();
});

test('pending_active is not flushed on a non-occurrence day', function () {
    Carbon::setTestNow('2026-06-10 12:00:00');

    $user = User::factory()->create();

    $stream = RecurringPaymentStream::factory()->create([
        'user_id'        => $user->id,
        'active'         => true,
        'pending_active' => false,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
    ]);

    app(\App\Services\RecurringPaymentCycleService::class)->processForUser($user->id);

    $stream->refresh();
    expect($stream->active)->toBeTrue();
    expect($stream->pending_active)->toBeFalse();
});

test('pending resume flushes on occurrence day', function () {
    Carbon::setTestNow('2026-06-15 12:00:00');

    $user = User::factory()->create();

    $stream = RecurringPaymentStream::factory()->create([
        'user_id'        => $user->id,
        'active'         => false,
        'pending_active' => true,
    ]);

    RecurringPaymentEntry::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'frequency'                   => 'monthly',
        'day_of_month'                => 15,
        'start_date'                  => '2026-01-15',
    ]);

    app(\App\Services\RecurringPaymentCycleService::class)->processForUser($user->id);

    $stream->refresh();
    expect($stream->active)->toBeTrue();
    expect($stream->pending_active)->toBeNull();
});
