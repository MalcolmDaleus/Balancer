<?php

use App\Enums\IncomeEntryType;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\User;

test('refund of already refunded purchase returns domain error shape', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    $purchase = Purchase::factory()->create([
        'user_id'     => $user->id,
        'category_id' => $category->id,
        'amount'      => 50,
        'is_refunded' => true,
    ]);

    $this->actingAs($user)->postJson("/api/v1/purchases/{$purchase->id}/refund")
        ->assertStatus(422)
        ->assertJsonPath('error', 'already_refunded')
        ->assertJsonStructure(['error', 'message']);
});

test('deleting a refund income entry returns domain error shape', function () {
    $user = User::factory()->create();
    $category = PurchaseCategory::factory()->create(['user_id' => $user->id]);
    $purchase = Purchase::factory()->create([
        'user_id'     => $user->id,
        'category_id' => $category->id,
        'amount'      => 40,
    ]);
    $refund = IncomeEntry::factory()->create([
        'user_id'     => $user->id,
        'type'        => IncomeEntryType::Refund,
        'purchase_id' => $purchase->id,
        'amount'      => 40,
        'name'        => 'Refund: test',
        'received_at' => now()->toDateString(),
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/income/entries/{$refund->id}")
        ->assertStatus(422)
        ->assertJsonPath('error', 'refund_immutable')
        ->assertJsonStructure(['error', 'message']);
});
