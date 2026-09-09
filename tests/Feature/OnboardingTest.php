<?php

use App\Enums\IncomeEntryType;
use App\Models\BudgetPlan;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\User;
use App\Services\LiquidityService;
use Carbon\Carbon;

test('verified users who have not onboarded are sent to onboarding', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('onboarding'));
});

test('finance api is blocked until onboarding is complete', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->getJson('/api/v1/balance-sheet')
        ->assertStatus(403)
        ->assertJsonPath('error', 'onboard_required');
});

test('onboarding page is available to a pending user', function () {
    $this->withoutVite();
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->get(route('onboarding'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('onboarding')
            ->where('replay', false));
});

test('onboarded users see the tour without forms', function () {
    $this->withoutVite();
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('onboarding'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('onboarding')
            ->where('replay', true));
});

test('completing onboarding stores seeds in cents and opens the dashboard', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->post(route('onboarding.store'), [
        'liquidity_cents' => 25000,
        'savings_cents' => 80000,
    ])->assertRedirect(route('dashboard'));

    $user->refresh();
    expect($user->onboarded_at)->not->toBeNull()
        ->and($user->liquidity_seed)->toBe(25000)
        ->and($user->savings_seed)->toBe(80000)
        ->and($user->liquidity_seed_on?->toDateString())->toBe(now()->toDateString());
});

test('zero seeds are allowed and blank is rejected', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->post(route('onboarding.store'), [
        'liquidity_cents' => 0,
        'savings_cents' => 0,
    ])->assertRedirect(route('dashboard'));

    $other = User::factory()->pendingOnboarding()->create();
    $this->actingAs($other)->post(route('onboarding.store'), [])
        ->assertSessionHasErrors(['liquidity_cents', 'savings_cents']);
});

test('optional global budget is written when provided', function () {
    Carbon::setTestNow('2026-09-10 12:00:00');
    $user = User::factory()->pendingOnboarding()->create();

    $this->actingAs($user)->post(route('onboarding.store'), [
        'liquidity_cents' => 1000,
        'savings_cents' => 0,
        'discretionary_cents' => 40000,
    ])->assertRedirect(route('dashboard'));

    $plan = BudgetPlan::query()->where('user_id', $user->id)->first();
    expect($plan)->not->toBeNull()
        ->and($plan->discretionary_cents)->toBe(40000)
        ->and($plan->envelopes()->count())->toBe(0);

    Carbon::setTestNow();
});

test('replay does not overwrite existing seeds', function () {
    $user = User::factory()->create([
        'liquidity_seed' => 12000,
        'savings_seed' => 34000,
    ]);

    $this->actingAs($user)->post(route('onboarding.store'), [
        'liquidity_cents' => 1,
        'savings_cents' => 1,
    ])->assertRedirect(route('dashboard'));

    $user->refresh();
    expect($user->liquidity_seed)->toBe(12000)
        ->and($user->savings_seed)->toBe(34000);
});

test('login sends a pending user to onboarding', function () {
    $user = User::factory()->pendingOnboarding()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('onboarding', absolute: false));
});

test('reset to onboarding wipes facts and clears the flag', function () {
    $user = User::factory()->create();
    Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->post(route('dev.reset-onboarding'))
        ->assertRedirect(route('onboarding'));

    expect($user->fresh()->onboarded_at)->toBeNull()
        ->and(Purchase::query()->where('user_id', $user->id)->count())->toBe(0);
});

test('available cash is seed plus later leftover', function () {
    Carbon::setTestNow('2026-09-15 12:00:00');
    $user = User::factory()->create([
        'liquidity_seed' => 10000,
        'savings_seed' => 5000,
        'liquidity_seed_on' => '2026-09-10',
    ]);

    IncomeEntry::factory()->create([
        'user_id' => $user->id,
        'type' => IncomeEntryType::Irregular,
        'amount' => 40,
        'received_at' => '2026-09-12',
    ]);

    $wallet = app(LiquidityService::class)->forUser($user->id);

    expect($wallet['available_cash_cents'])->toBe(14000)
        ->and($wallet['savings_total_cents'])->toBe(5000);

    Carbon::setTestNow();
});
