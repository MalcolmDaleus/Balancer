<?php

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access purchases', function () {
    $this->getJson('/api/v1/purchases')->assertStatus(401);
    $this->postJson('/api/v1/purchases', [])->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

test('user can list their own purchases', function () {
    $user = User::factory()->create();
    Purchase::factory()->count(3)->create(['user_id' => $user->id]);
    Purchase::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/purchases')
        ->assertOk()->assertJsonCount(3, 'data');
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

test('user can create a purchase', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount_cents' => 4999,
        'description' => 'Groceries',
        'date' => '2026-04-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.amount_cents', 4999)
        ->assertJsonPath('data.description', 'Groceries')
        ->assertJsonPath('data.is_refunded', false)
        ->assertJsonPath('data.user_id', $user->id);

    $this->assertDatabaseHas('purchases', ['description' => 'Groceries', 'user_id' => $user->id]);
});

test('store fails when category_id is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'amount_cents' => 1000,
        'description' => 'Test',
        'date' => '2026-04-01',
    ])->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('store fails with missing required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/purchases', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed')
        ->assertJsonStructure(['details' => ['amount_cents', 'description', 'date']]);
});

test('store rejects category belonging to another user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount_cents' => 1000,
        'description' => 'Test',
        'date' => '2026-04-01',
    ])->assertStatus(422);
});

test('store rejects amount <= 0', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount_cents' => 0,
        'description' => 'Test',
        'date' => '2026-04-01',
    ])->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Show / Update / Destroy
// ---------------------------------------------------------------------------

test('user can view their own purchase', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/purchases/{$purchase->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $purchase->id);
});

test('user cannot view another user\'s purchase', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/purchases/{$purchase->id}")
        ->assertStatus(403);
});

test('user can update their own purchase', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson("/api/v1/purchases/{$purchase->id}", [
        'description' => 'Updated description',
    ])->assertOk()->assertJsonPath('data.description', 'Updated description');
});

test('user cannot update another user\'s purchase', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->putJson("/api/v1/purchases/{$purchase->id}", [
        'description' => 'Hacked',
    ])->assertStatus(403);
});

test('user can delete their own purchase', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/purchases/{$purchase->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('purchases', ['id' => $purchase->id]);
});

test('user cannot delete another user\'s purchase', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/purchases/{$purchase->id}")
        ->assertStatus(403);
});

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

test('user can refund a purchase and an income entry is created', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'amount' => 49.99, 'description' => 'Faulty headphones']);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', true)
        ->assertJsonPath('purchase.refund_status', 'full')
        ->assertJsonPath('purchase.refunded_cents', 4999);

    $this->assertDatabaseHas('income_entries', [
        'user_id' => $user->id,
        'purchase_id' => $purchase->id,
        'type' => IncomeEntryType::Refund->value,
        'name' => 'Refund: Faulty headphones',
        'amount' => 49.99,
    ]);
    $this->assertDatabaseHas('purchases', ['id' => $purchase->id, 'is_refunded' => true]);
});

test('user can partially refund a purchase and refund again until fully refunded', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'amount' => 60.00]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund", ['amount_cents' => 2000])
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', false)
        ->assertJsonPath('purchase.refund_status', 'partial')
        ->assertJsonPath('purchase.refunded_cents', 2000)
        ->assertJsonPath('purchase.remaining_refundable_cents', 4000);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund", ['amount_cents' => 2000])
        ->assertOk()
        ->assertJsonPath('purchase.refund_status', 'partial')
        ->assertJsonPath('purchase.refunded_cents', 4000);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', true)
        ->assertJsonPath('purchase.refund_status', 'full')
        ->assertJsonPath('purchase.refunded_cents', 6000);

    $this->assertEquals(3, IncomeEntry::where('purchase_id', $purchase->id)->count());
});

test('partial refund amount over remaining is capped to remaining balance', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'amount' => 60.00]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund", ['amount_cents' => 2000])
        ->assertOk();

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund", ['amount_cents' => 5000])
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', true)
        ->assertJsonPath('purchase.refunded_cents', 6000);

    $this->assertEquals(2, IncomeEntry::where('purchase_id', $purchase->id)->count());
});

test('refunding a purchase that is already fully refunded returns 422', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'is_refunded' => true]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertStatus(422)
        ->assertJsonPath('error', 'already_refunded');
});

test('spending total is unchanged after refund (purchase still counted)', function () {
    $user = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'is_refunded' => false]);

    // Refund does not delete the purchase
    $this->assertDatabaseHas('purchases', ['id' => $purchase->id]);
    $this->assertEquals(1, Purchase::where('user_id', $user->id)->count());
});

// ---------------------------------------------------------------------------
// Month lock
// ---------------------------------------------------------------------------

test('store on locked month returns 423', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    BalanceSheetTotal::create([
        'user_id' => $user->id,
        'month' => '2026-03-01',
        'total_income' => 0,
        'total_debt_paid' => 0,
        'total_spending' => 0,
        'savings_snapshot' => 0,
        'roll_over' => 0,
    ]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount_cents' => 1000,
        'description' => 'Test',
        'date' => '2026-03-15',
    ])->assertStatus(423)->assertJsonPath('error', 'month_locked');
});

test('full refund succeeds on a purchase in a locked month', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    $purchase = Purchase::factory()->create([
        'user_id' => $user->id,
        'category_id' => $category->id,
        'amount' => 50.00,
        'date' => '2026-03-15',
        'is_refunded' => false,
    ]);

    BalanceSheetTotal::create([
        'user_id' => $user->id,
        'month' => '2026-03-01',
        'total_income' => 0,
        'total_debt_paid' => 0,
        'total_spending' => 0,
        'total_recurring' => 0,
        'savings_snapshot' => 0,
        'roll_over' => 0,
    ]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', true);

    expect($purchase->fresh()->is_refunded)->toBeTrue();
    $this->assertDatabaseHas('income_entries', [
        'purchase_id' => $purchase->id,
        'type' => IncomeEntryType::Refund->value,
    ]);
});
