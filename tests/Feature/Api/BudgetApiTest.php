<?php

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\BudgetEnvelope;
use App\Models\BudgetPlan;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\User;
use App\Services\BalanceSheetService;
use App\Services\BudgetService;
use App\Support\MoneyCents;
use Carbon\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-09-15 12:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

test('money cents round half up at the major boundary', function () {
    expect(MoneyCents::fromMajor(12.34))->toBe(1234)
        ->and(MoneyCents::fromMajor('12.345'))->toBe(1235)
        ->and(MoneyCents::fromMajor(50))->toBe(5000)
        ->and(MoneyCents::toMajor(1234))->toBe(12.34)
        ->and(MoneyCents::toMajorString(1234))->toBe('12.34')
        ->and(MoneyCents::toMajorString(-50))->toBe('-0.50');
});

test('guests cannot read the budget', function () {
    $this->getJson('/api/v1/budget')->assertStatus(401);
});

test('empty budget has no plan and a CTA-ready payload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/budget')
        ->assertOk()
        ->assertJsonPath('has_plan', false)
        ->assertJsonPath('month', '2026-09')
        ->assertJsonPath('discretionary.plan_cents', 0)
        ->assertJsonPath('bills.auto', true);
});

test('budget payload includes spend so far per purchase category', function () {
    $user = User::factory()->create();
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Groceries']);
    PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Dining']);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'amount' => 45.5,
        'date' => '2026-09-04',
    ]);

    $cats = $this->actingAs($user)->getJson('/api/v1/budget')
        ->assertOk()
        ->assertJsonPath('savings_this_month_cents', 0)
        ->json('purchase_categories');

    expect(collect($cats)->firstWhere('name', 'Groceries')['actual_cents'])->toBe(4550)
        ->and(collect($cats)->firstWhere('name', 'Dining')['actual_cents'])->toBe(0);
});

test('user can upsert a plan in cents and see left to spend', function () {
    $user = User::factory()->create();
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Groceries']);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'amount' => 80,
        'date' => '2026-09-05',
    ]);

    $this->actingAs($user)->putJson('/api/v1/budget', [
        'discretionary_cents' => 10000,
        'envelopes' => [
            ['domain' => 'purchase', 'category_id' => $food->id, 'amount_cents' => 5000],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('has_plan', true)
        ->assertJsonPath('discretionary.plan_cents', 10000)
        ->assertJsonPath('discretionary.actual_cents', 8000)
        ->assertJsonPath('discretionary.left_cents', 2000)
        ->assertJsonPath('categories.0.name', 'Groceries')
        ->assertJsonPath('categories.0.left_cents', -3000)
        ->assertJsonPath('unallocated.plan_cents', 5000);

    $this->assertDatabaseHas('budget_plans', [
        'user_id' => $user->id,
        'discretionary_cents' => 10000,
    ]);
});

test('refunds reduce discretionary actual in the purchase month', function () {
    $user = User::factory()->create();
    $misc = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    $purchase = Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $misc->id,
        'amount' => 50,
        'date' => '2026-09-02',
        'is_refunded' => true,
    ]);
    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Refund,
        'name' => 'Refund',
        'amount' => 20,
        'received_at' => '2026-09-10',
        'purchase_id' => $purchase->id,
    ]);

    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-09-01',
        'discretionary_cents' => 10000,
    ]);

    $shown = app(BudgetService::class)->show($user->id, '2026-09');

    expect($shown['discretionary']['actual_cents'])->toBe(3000)
        ->and($shown['discretionary']['left_cents'])->toBe(7000);
});

test('category caps cannot exceed the global plan', function () {
    $user = User::factory()->create();
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson('/api/v1/budget', [
        'discretionary_cents' => 1000,
        'envelopes' => [
            ['domain' => 'purchase', 'category_id' => $food->id, 'amount_cents' => 2000],
        ],
    ])
        ->assertStatus(422)
        ->assertJsonPath('error', 'envelope_overflow');
});

test('another user category is rejected', function () {
    $user = User::factory()->create();
    $other = PurchaseCategory::factory()->create();

    $this->actingAs($user)->putJson('/api/v1/budget', [
        'discretionary_cents' => 5000,
        'envelopes' => [
            ['domain' => 'purchase', 'category_id' => $other->id, 'amount_cents' => 1000],
        ],
    ])
        ->assertStatus(422)
        ->assertJsonPath('error', 'invalid_category');
});

test('locked month cannot be edited', function () {
    $user = User::factory()->create();
    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-08-01',
        'discretionary_cents' => 8000,
    ]);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-08-01',
    ]);

    $this->actingAs($user)->putJson('/api/v1/budget', [
        'month' => '2026-08',
        'discretionary_cents' => 9000,
    ])->assertStatus(423);
});

test('closing a month copies the plan forward without leftover', function () {
    $user = User::factory()->create();
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id, 'name' => 'Groceries']);
    $plan = BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-08-01',
        'discretionary_cents' => 20000,
        'bills_cents' => 4000,
        'debt_payment_cents' => 1500,
    ]);
    BudgetEnvelope::factory()->create([
        'user_id' => $user->id,
        'budget_plan_id' => $plan->id,
        'category_id' => $food->id,
        'amount_cents' => 8000,
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'amount' => 30,
        'date' => '2026-08-10',
    ]);

    (new BalanceSheetService($user->id, '2026-08'))->persistSnapshot();

    $september = BudgetPlan::query()
        ->where('user_id', $user->id)
        ->whereDate('month', '2026-09-01')
        ->first();

    expect($september)->not->toBeNull()
        ->and($september->discretionary_cents)->toBe(20000)
        ->and($september->bills_cents)->toBe(4000)
        ->and($september->debt_payment_cents)->toBe(1500)
        ->and($september->copied_from_month?->toDateString())->toBe('2026-08-01')
        ->and($september->envelopes()->first()->amount_cents)->toBe(8000);
});

test('copy forward does not overwrite an existing next-month plan', function () {
    $user = User::factory()->create();
    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-08-01',
        'discretionary_cents' => 20000,
    ]);
    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-09-01',
        'discretionary_cents' => 5000,
    ]);

    (new BalanceSheetService($user->id, '2026-08'))->persistSnapshot();

    $september = BudgetPlan::query()
        ->where('user_id', $user->id)
        ->whereDate('month', '2026-09-01')
        ->first();

    expect($september?->discretionary_cents)->toBe(5000)
        ->and(BudgetPlan::query()->where('user_id', $user->id)->count())->toBe(2);
});

test('user can delete an unlocked plan', function () {
    $user = User::factory()->create();
    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-09-01',
        'discretionary_cents' => 10000,
    ]);

    $this->actingAs($user)->deleteJson('/api/v1/budget?month=2026-09')
        ->assertNoContent();

    expect(BudgetPlan::query()->where('user_id', $user->id)->count())->toBe(0);
});

test('plans are scoped to the authenticated user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    BudgetPlan::factory()->create([
        'user_id' => $other->id,
        'month' => '2026-09-01',
        'discretionary_cents' => 99999,
    ]);

    $this->actingAs($user)->getJson('/api/v1/budget')
        ->assertOk()
        ->assertJsonPath('has_plan', false);
});

test('statistics expose budget leftover and adherence', function () {
    $user = User::factory()->create();
    $food = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    BudgetPlan::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-09-01',
        'discretionary_cents' => 10000,
    ]);
    Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $food->id,
        'amount' => 40,
        'date' => '2026-09-04',
    ]);

    $this->actingAs($user)
        ->getJson('/api/v1/statistics?view=trend&series=budget_left&window=1')
        ->assertOk()
        ->assertJsonPath('series', 'budget_left')
        ->assertJsonPath('points.0.value', 6000);

    $this->actingAs($user)
        ->getJson('/api/v1/statistics?view=trend&series=budget_adherence&window=1')
        ->assertOk()
        ->assertJsonPath('unit', 'percent')
        ->assertJsonPath('points.0.value', 0.4);

    $this->actingAs($user)
        ->getJson('/api/v1/statistics/markers?window=1')
        ->assertOk()
        ->assertJsonFragment(['id' => 'budget_this_month']);
});

test('budget lists each open debt with remaining and original amounts', function () {
    $user = User::factory()->create();
    $laptop = Debt::factory()->create([
        'user_id' => $user->id,
        'description' => 'Laptop',
        'amount' => 1200,
        'issue_date' => '2026-08-01',
    ]);
    $settled = Debt::factory()->create([
        'user_id' => $user->id,
        'description' => 'Settled card',
        'amount' => 80,
        'issue_date' => '2026-07-01',
    ]);
    DebtPayment::factory()->create([
        'user_id' => $user->id,
        'debt_id' => $laptop->id,
        'amount' => 200,
        'paid_at' => '2026-09-04',
    ]);
    DebtPayment::factory()->create([
        'user_id' => $user->id,
        'debt_id' => $settled->id,
        'amount' => 80,
        'paid_at' => '2026-08-20',
    ]);

    $open = $this->actingAs($user)->getJson('/api/v1/budget')
        ->assertOk()
        ->assertJsonPath('debts.remaining_cents', 100000)
        ->assertJsonPath('debts.paid_cents', 20000)
        ->json('debts.open');

    expect($open)->toHaveCount(1)
        ->and($open[0]['name'])->toBe('Laptop')
        ->and($open[0]['original_cents'])->toBe(120000)
        ->and($open[0]['remaining_cents'])->toBe(100000)
        ->and($open[0]['paid_this_month_cents'])->toBe(20000);
});
