<?php

use App\Models\Debt;
use App\Models\DebtPayment;
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
        ->assertJsonPath('tracking_since', '2025-10')
        ->assertJsonPath('months_tracked', 12);
});
