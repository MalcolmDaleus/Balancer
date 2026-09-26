<?php

use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\User;
use Carbon\Carbon;

afterEach(function () {
    Carbon::setTestNow();
});

test('unauthenticated user cannot access standing', function () {
    $this->getJson('/api/v1/standing')->assertStatus(401);
});

test('standing returns wallet stocks, open debt, and tracking span', function () {
    Carbon::setTestNow('2026-09-12 12:00:00');

    $user = User::factory()->create([
        'liquidity_seed' => 25000,
        'savings_seed' => 10000,
        'onboarded_at' => '2025-10-15 09:00:00',
    ]);

    $open = Debt::factory()->create([
        'user_id' => $user->id,
        'amount' => 500,
        'is_forgiven' => false,
    ]);
    DebtPayment::factory()->create([
        'user_id' => $user->id,
        'debt_id' => $open->id,
        'amount' => 100,
        'paid_at' => '2026-08-15',
    ]);
    Debt::factory()->create([
        'user_id' => $user->id,
        'amount' => 200,
        'is_forgiven' => true,
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/standing');

    $response->assertOk()
        ->assertJsonPath('available_cash_cents', 25000)
        ->assertJsonPath('savings_total_cents', 10000)
        ->assertJsonPath('owed_cents', 40000)
        ->assertJsonPath('upcoming_cents', 0)
        ->assertJsonPath('upcoming', [])
        ->assertJsonPath('tracking_since', '2025-10')
        ->assertJsonPath('months_tracked', 12);
});

test('standing lists remaining open-month recurring charges and skips paused or already-due ones', function () {
    Carbon::setTestNow('2026-09-12 12:00:00');

    $user = User::factory()->create([
        'onboarded_at' => '2025-10-15 09:00:00',
    ]);
    $category = RecurringPaymentCategory::factory()->create(['user_id' => $user->id]);

    $stream = function (string $name, bool $active = true) use ($user, $category) {
        return RecurringPaymentStream::factory()->create([
            'user_id' => $user->id,
            'recurring_payment_category_id' => $category->id,
            'name' => $name,
            'active' => $active,
        ]);
    };

    RecurringPaymentEntry::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream('Netflix')->id,
        'amount' => 20,
        'frequency' => 'monthly',
        'day_of_month' => 15,
        'start_date' => '2026-01-15',
        'active' => true,
    ]);
    RecurringPaymentEntry::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream('Power')->id,
        'amount' => 50,
        'frequency' => 'monthly',
        'day_of_month' => 28,
        'start_date' => '2026-01-28',
        'active' => true,
    ]);
    RecurringPaymentEntry::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream('Rent')->id,
        'amount' => 100,
        'frequency' => 'monthly',
        'day_of_month' => 5,
        'start_date' => '2026-01-05',
        'active' => true,
    ]);
    RecurringPaymentEntry::factory()->create([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream('Gym', false)->id,
        'amount' => 25,
        'frequency' => 'monthly',
        'day_of_month' => 20,
        'start_date' => '2026-01-20',
        'active' => true,
    ]);

    $this->actingAs($user)->getJson('/api/v1/standing')
        ->assertOk()
        ->assertJsonPath('upcoming_cents', 7000)
        ->assertJsonPath('upcoming.0.name', 'Netflix')
        ->assertJsonPath('upcoming.0.date', '2026-09-15')
        ->assertJsonPath('upcoming.0.amount_cents', 2000)
        ->assertJsonPath('upcoming.1.name', 'Power')
        ->assertJsonPath('upcoming.1.date', '2026-09-28')
        ->assertJsonPath('upcoming.1.amount_cents', 5000)
        ->assertJsonCount(2, 'upcoming');
});
