<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PurchaseCategory;
use App\Models\User;

class PurchaseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (! $user) {
            $this->command->warn('PurchaseCategorySeeder: no users found, skipping.');
            return;
        }

        $categories = ['Groceries', 'Dining', 'Miscellaneous', 'Clothes & Accesories', 'Adulting', 'Household Items', 'Entertainment', 'Surprises', 'Gifts', 'Caprichos'];

        foreach ($categories as $name) {
            PurchaseCategory::firstOrCreate(
                ['user_id' => $user->id, 'category_name' => $name]
            );
        }
    }
}
