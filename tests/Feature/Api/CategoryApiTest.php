<?php

use App\Models\DebtCategory;
use App\Models\PurchaseCategory;
use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test('unauthenticated user cannot access categories', function () {
    $this->getJson('/api/v1/categories/purchases')->assertStatus(401);
    $this->getJson('/api/v1/categories/debts')->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Purchase Categories
// ---------------------------------------------------------------------------

test('user can list their purchase categories', function () {
    $user = User::factory()->create();
    PurchaseCategory::factory()->count(4)->create(['user_id' => $user->id]);
    PurchaseCategory::factory()->count(2)->create();

    $this->actingAs($user)->getJson('/api/v1/categories/purchases')
        ->assertOk()
        ->assertJsonCount(4, 'data');
});

test('user can create a purchase category', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/categories/purchases', [
        'category_name' => 'Food',
    ])->assertCreated()
      ->assertJsonPath('data.category_name', 'Food');
});

test('user can update a purchase category', function () {
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id, 'category_name' => 'Old']);

    $this->actingAs($user)->putJson("/api/v1/categories/purchases/{$category->id}", [
        'category_name' => 'New',
    ])->assertOk()->assertJsonPath('data.category_name', 'New');
});

test('user cannot update another user\'s purchase category', function () {
    $user     = User::factory()->create();
    $other    = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)->putJson("/api/v1/categories/purchases/{$category->id}", [
        'category_name' => 'Hacked',
    ])->assertStatus(403);
});

test('purchase category is hard deleted when unused', function () {
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)->deleteJson("/api/v1/categories/purchases/{$category->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('purchase_categories', ['id' => $category->id]);
});

test('purchase category is soft deleted when purchases exist', function () {
    $user     = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    \App\Models\Purchase::factory()->create(['user_id' => $user->id, 'category_id' => $category->id]);

    $this->actingAs($user)->deleteJson("/api/v1/categories/purchases/{$category->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('purchase_categories', ['id' => $category->id]);
});

// ---------------------------------------------------------------------------
// Debt Categories
// ---------------------------------------------------------------------------

test('user can list their debt categories', function () {
    $user = User::factory()->create();
    DebtCategory::factory()->count(2)->create(['user_id' => $user->id]);
    DebtCategory::factory()->count(3)->create();

    $this->actingAs($user)->getJson('/api/v1/categories/debts')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('user can create a debt category', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/categories/debts', [
        'category_name' => 'Mortgage',
    ])->assertCreated()
      ->assertJsonPath('data.category_name', 'Mortgage');
});

test('category create fails without name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/categories/purchases', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('income categories route no longer exists', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/categories/income')->assertStatus(404);
});
