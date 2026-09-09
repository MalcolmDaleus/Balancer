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
use Carbon\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-09-15 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

test('guests cannot read the ledger feed', function () {
    $this->getJson('/api/v1/ledger/feed')->assertStatus(401);
});

test('feed is blocked until onboarding is complete', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->getJson('/api/v1/ledger/feed')
        ->assertStatus(403)
        ->assertJsonPath('error', 'onboard_required');
});

test('feed defaults to this month newest first', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'description' => 'Coffee',
        'amount' => 4.50,
        'date' => '2026-09-02',
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'name' => 'Bonus',
        'amount' => 100,
        'received_at' => '2026-09-10',
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'description' => 'Last month',
        'amount' => 9,
        'date' => '2026-08-20',
    ]);

    $this->actingAs($user)->getJson('/api/v1/ledger/feed')
        ->assertOk()
        ->assertJsonPath('from', '2026-09-01')
        ->assertJsonPath('to', '2026-09-30')
        ->assertJsonCount(2, 'facts')
        ->assertJsonPath('facts.0.label', 'Bonus')
        ->assertJsonPath('facts.1.label', 'Coffee');
});

test('feed filters by text domain and amount', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Food']);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'description' => 'Groceries',
        'amount' => 40,
        'date' => '2026-09-05',
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'description' => 'Movie',
        'amount' => 12,
        'date' => '2026-09-06',
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'name' => 'Side gig',
        'amount' => 80,
        'received_at' => '2026-09-07',
    ]);

    $this->actingAs($user)
        ->getJson('/api/v1/ledger/feed?q=groc')
        ->assertOk()
        ->assertJsonCount(1, 'facts')
        ->assertJsonPath('facts.0.label', 'Groceries');

    $this->actingAs($user)
        ->getJson('/api/v1/ledger/feed?domain=income')
        ->assertOk()
        ->assertJsonCount(1, 'facts')
        ->assertJsonPath('facts.0.domain', 'income');

    $this->actingAs($user)
        ->getJson('/api/v1/ledger/feed?amount_min_cents=2000&amount_max_cents=5000')
        ->assertOk()
        ->assertJsonCount(1, 'facts')
        ->assertJsonPath('facts.0.label', 'Groceries');
});

test('feed includes all five fact domains and a debt name', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'date' => '2026-09-03',
        'amount' => 10,
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'received_at' => '2026-09-04',
        'amount' => 20,
    ]);
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-09-01'])
        ->create(['user_id' => $user->id, 'name' => 'Phone']);
    RecurringCharge::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $stream->entries()->first()->id,
        'occurred_on' => '2026-09-05',
        'amount' => 15,
        'stream_name' => 'Phone',
    ]);
    $debt = Debt::factory()->create([
        'user_id' => $user->id,
        'description' => 'Laptop loan',
        'amount' => 200,
        'issue_date' => '2026-01-01',
    ]);
    DebtPayment::factory()->create([
        'user_id' => $user->id,
        'debt_id' => $debt->id,
        'amount' => 50,
        'paid_at' => '2026-09-08',
    ]);
    Saving::factory()->create([
        'user_id' => $user->id,
        'type' => 'deposit',
        'amount' => 80,
        'month' => '2026-09-01',
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/ledger/feed')->assertOk();
    $domains = collect($response->json('facts'))->pluck('domain')->sort()->values()->all();

    expect($domains)->toBe(['debt', 'income', 'recurring', 'savings', 'spending']);
    expect(collect($response->json('facts'))->firstWhere('domain', 'debt')['label'])->toBe('Laptop loan');
});

test('feed does not leak another user facts', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $other->id]);

    Purchase::factory()->create([
        'user_id' => $other->id,
        'category_id' => $category->id,
        'description' => 'Secret',
        'date' => '2026-09-10',
        'amount' => 99,
    ]);

    $this->actingAs($user)->getJson('/api/v1/ledger/feed')
        ->assertOk()
        ->assertJsonCount(0, 'facts');
});
