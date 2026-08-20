<?php

use App\Enums\IncomeEntryType;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringCharge;
use App\Models\RecurringPaymentStream;
use App\Models\Saving;
use App\Models\User;
use App\Services\FinancialFlowReadModel;

test('forUser returns empty collection for user with no facts', function () {
    $user = User::factory()->create();

    $facts = app(FinancialFlowReadModel::class)->forUser($user->id);

    expect($facts)->toBeEmpty();
});

test('forUser returns multi-domain facts with expected shape and filters by range', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Food']);

    IncomeEntry::factory()->create([
        'user_id'     => $user->id,
        'type'        => IncomeEntryType::Irregular,
        'name'        => 'Bonus',
        'amount'      => 100,
        'received_at' => '2026-03-10',
    ]);
    Purchase::factory()->create([
        'user_id'     => $user->id,
        'category_id' => $category->id,
        'description' => 'Groceries',
        'amount'      => 40,
        'date'        => '2026-03-15',
    ]);
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-03-01'])
        ->create(['user_id' => $user->id, 'name' => 'Netflix']);
    RecurringCharge::factory()->create([
        'user_id'                     => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id'  => $stream->entries()->first()->id,
        'occurred_on'                 => '2026-03-12',
        'amount'                      => 15.99,
        'stream_name'                 => 'Netflix',
    ]);
    $debt = Debt::factory()->create([
        'user_id'     => $user->id,
        'amount'      => 200,
        'issue_date'  => '2026-01-01',
    ]);
    DebtPayment::factory()->create([
        'user_id'  => $user->id,
        'debt_id'  => $debt->id,
        'amount'   => 50,
        'paid_at'  => '2026-03-20',
    ]);
    Saving::factory()->create([
        'user_id' => $user->id,
        'type'    => 'deposit',
        'amount'  => 80,
        'month'   => '2026-03-01',
    ]);

    // Out of range + other user — must not appear in filtered result
    Purchase::factory()->create([
        'user_id'     => $user->id,
        'category_id' => $category->id,
        'date'        => '2026-01-05',
        'amount'      => 9,
    ]);
    IncomeEntry::factory()->create([
        'user_id'     => $other->id,
        'type'        => IncomeEntryType::Irregular,
        'received_at' => '2026-03-10',
        'amount'      => 999,
    ]);

    $facts = app(FinancialFlowReadModel::class)->forUser(
        $user->id,
        '2026-03-01',
        '2026-03-31',
    );

    expect($facts)->toHaveCount(5);

    $domains = $facts->pluck('domain')->sort()->values()->all();
    expect($domains)->toBe(['debt', 'income', 'recurring', 'savings', 'spending']);

    $keys = [
        'domain', 'kind', 'occurred_on', 'amount', 'direction',
        'classifier_id', 'classifier_name', 'instrument_id', 'source_id', 'label',
    ];
    foreach ($facts as $fact) {
        foreach ($keys as $key) {
            expect($fact)->toHaveKey($key);
        }
    }

    $dates = $facts->pluck('occurred_on')->all();
    $sorted = $dates;
    sort($sorted);
    expect($dates)->toBe($sorted);

    // Full history includes the January purchase too
    $all = app(FinancialFlowReadModel::class)->forUser($user->id);
    expect($all->count())->toBeGreaterThanOrEqual(6);
    expect($all->contains(fn ($f) => $f['domain'] === 'spending' && (float) $f['amount'] === 9.0))->toBeTrue();
});

test('forUser orders facts by occurred_on ascending', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    Purchase::factory()->create([
        'user_id'     => $user->id,
        'category_id' => $category->id,
        'date'        => '2026-05-20',
        'amount'      => 10,
    ]);
    IncomeEntry::factory()->create([
        'user_id'     => $user->id,
        'type'        => IncomeEntryType::Irregular,
        'received_at' => '2026-05-05',
        'amount'      => 20,
    ]);
    Saving::factory()->create([
        'user_id' => $user->id,
        'type'    => 'deposit',
        'amount'  => 5,
        'month'   => '2026-05-01',
    ]);

    $facts = app(FinancialFlowReadModel::class)->forUser($user->id);

    expect($facts->pluck('occurred_on')->all())->toBe([
        '2026-05-01',
        '2026-05-05',
        '2026-05-20',
    ]);
});
