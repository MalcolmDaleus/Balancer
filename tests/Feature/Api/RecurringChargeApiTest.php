<?php

use App\Models\BalanceSheetTotal;
use App\Models\RecurringCharge;
use App\Models\RecurringOccurrenceSkip;
use App\Models\RecurringPaymentStream;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function makeRecurringCharge(User $user, array $overrides = []): RecurringCharge
{
    $stream = RecurringPaymentStream::factory()
        ->withActiveEntry(['start_date' => '2026-01-01'])
        ->create(['user_id' => $user->id]);

    return RecurringCharge::factory()->create(array_merge([
        'user_id' => $user->id,
        'recurring_payment_stream_id' => $stream->id,
        'recurring_payment_entry_id' => $stream->entries()->first()->id,
        'stream_name' => $stream->name,
        'occurred_on' => '2026-06-15',
        'amount' => 25.00,
    ], $overrides));
}

test('unauthenticated user cannot access recurring charges', function () {
    $this->getJson('/api/v1/recurring-payments/charges')->assertStatus(401);
    $this->putJson('/api/v1/recurring-payments/charges/1', [])->assertStatus(401);
    $this->deleteJson('/api/v1/recurring-payments/charges/1')->assertStatus(401);
});

test('user can list their own recurring charges', function () {
    $user = User::factory()->create();
    makeRecurringCharge($user);
    makeRecurringCharge($user, ['occurred_on' => '2026-07-15']);
    makeRecurringCharge(User::factory()->create());

    $this->actingAs($user)->getJson('/api/v1/recurring-payments/charges')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can view their own recurring charge', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge($user);

    $this->actingAs($user)->getJson("/api/v1/recurring-payments/charges/{$charge->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $charge->id)
        ->assertJsonPath('data.amount_cents', 2500)
        ->assertJsonPath('data.occurred_on', '2026-06-15');
});

test('user cannot view another user\'s recurring charge', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge(User::factory()->create());

    $this->actingAs($user)->getJson("/api/v1/recurring-payments/charges/{$charge->id}")
        ->assertStatus(403);
});

test('user can update a recurring charge amount in an open month', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge($user);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/charges/{$charge->id}", [
        'amount_cents' => 3000,
    ])->assertOk()->assertJsonPath('data.amount_cents', 3000);

    expect((string) $charge->fresh()->amount)->toBe('30.00');
});

test('user cannot update another user\'s recurring charge', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge(User::factory()->create());

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/charges/{$charge->id}", [
        'amount_cents' => 3000,
    ])->assertStatus(403);
});

test('recurring charge update on a locked month returns 423', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge($user, ['occurred_on' => '2026-03-15']);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-03-01',
    ]);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/charges/{$charge->id}", [
        'amount_cents' => 3000,
    ])->assertStatus(423);
});

test('recurring charge delete on a locked month returns 423', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge($user, ['occurred_on' => '2026-03-15']);
    BalanceSheetTotal::factory()->create([
        'user_id' => $user->id,
        'month' => '2026-03-01',
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/recurring-payments/charges/{$charge->id}")
        ->assertStatus(423);

    expect(RecurringCharge::whereKey($charge->id)->exists())->toBeTrue();
    expect(RecurringOccurrenceSkip::count())->toBe(0);
});

test('updating a recurring charge rejects zero amount', function () {
    $user = User::factory()->create();
    $charge = makeRecurringCharge($user);

    $this->actingAs($user)->putJson("/api/v1/recurring-payments/charges/{$charge->id}", [
        'amount_cents' => 0,
    ])->assertStatus(422);
});
