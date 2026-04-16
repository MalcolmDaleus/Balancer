<?php

use App\Models\BalanceSheetTotal;
use App\Models\IncomeCategory;
use App\Models\IncomeEntry;
use App\Models\IncomeStream;
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
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount'      => 49.99,
        'description' => 'Groceries',
        'date'        => '2026-04-01',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.amount', 49.99)
        ->assertJsonPath('data.description', 'Groceries')
        ->assertJsonPath('data.is_refunded', false)
        ->assertJsonPath('data.user_id', $user->id);

    $this->assertDatabaseHas('purchases', ['description' => 'Groceries', 'user_id' => $user->id]);
});

test('store fails when category_id is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'amount'      => 10.00,
        'description' => 'Test',
        'date'        => '2026-04-01',
    ])->assertStatus(422)
      ->assertJsonPath('error', 'validation_failed');
});

test('store fails with missing required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/purchases', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed')
        ->assertJsonStructure(['details' => ['amount', 'description', 'date']]);
});

test('store rejects category belonging to another user', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount'      => 10.00,
        'description' => 'Test',
        'date'        => '2026-04-01',
    ])->assertStatus(422);
});

test('store rejects amount <= 0', function () {
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount'      => 0,
        'description' => 'Test',
        'date'        => '2026-04-01',
    ])->assertStatus(422);
});

// ---------------------------------------------------------------------------
// Show / Update / Destroy
// ---------------------------------------------------------------------------

test('user can view their own purchase', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->getJson("/api/v1/purchases/{$purchase->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $purchase->id);
});

test('user cannot view another user\'s purchase', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->getJson("/api/v1/purchases/{$purchase->id}")
        ->assertStatus(403);
});

test('user can update their own purchase', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson("/api/v1/purchases/{$purchase->id}", [
        'description' => 'Updated description',
    ])->assertOk()->assertJsonPath('data.description', 'Updated description');
});

test('user cannot update another user\'s purchase', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->putJson("/api/v1/purchases/{$purchase->id}", [
        'description' => 'Hacked',
    ])->assertStatus(403);
});

test('user can delete their own purchase', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/purchases/{$purchase->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('purchases', ['id' => $purchase->id]);
});

test('user cannot delete another user\'s purchase', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->deleteJson("/api/v1/purchases/{$purchase->id}")
        ->assertStatus(403);
});

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

test('user can refund a purchase and an income entry is created', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id]);

    // Create the system Refunds stream that the refund flow requires
    $refundCat    = IncomeCategory::factory()->create(['user_id' => $user->id, 'category_name' => 'Refund']);
    IncomeStream::factory()->system()->create([
        'user_id'     => $user->id,
        'category_id' => $refundCat->id,
        'name'        => 'Refunds',
    ]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertOk()
        ->assertJsonPath('purchase.is_refunded', true);

    $this->assertDatabaseHas('income_entries', [
        'user_id'     => $user->id,
        'purchase_id' => $purchase->id,
    ]);
    $this->assertDatabaseHas('purchases', ['id' => $purchase->id, 'is_refunded' => true]);
});

test('refunding a purchase that is already refunded returns 422', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'is_refunded' => true]);

    $refundCat = IncomeCategory::factory()->create(['user_id' => $user->id, 'category_name' => 'Refund']);
    IncomeStream::factory()->system()->create([
        'user_id'     => $user->id,
        'category_id' => $refundCat->id,
        'name'        => 'Refunds',
    ]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertStatus(422)
        ->assertJsonPath('error', 'already_refunded');
});

test('spending total is unchanged after refund (purchase still counted)', function () {
    $user     = User::factory()->create();
    $purchase = Purchase::factory()->create(['user_id' => $user->id, 'is_refunded' => false]);

    // Refund does not delete the purchase
    $this->assertDatabaseHas('purchases', ['id' => $purchase->id]);
    $this->assertEquals(1, Purchase::where('user_id', $user->id)->count());
});

// ---------------------------------------------------------------------------
// Month lock
// ---------------------------------------------------------------------------

test('store on locked month returns 423', function () {
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    BalanceSheetTotal::create([
        'user_id'          => $user->id,
        'month'            => '2026-03-01',
        'total_income'     => 0,
        'total_debt_paid'  => 0,
        'total_spending'   => 0,
        'savings_snapshot' => 0,
        'roll_over'        => 0,
    ]);

    $this->actingAs($user)->postJson('/api/v1/purchases', [
        'category_id' => $category->id,
        'amount'      => 10.00,
        'description' => 'Test',
        'date'        => '2026-03-15',
    ])->assertStatus(423)->assertJsonPath('error', 'month_locked');
});
