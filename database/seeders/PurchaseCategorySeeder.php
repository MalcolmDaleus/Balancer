<?php

namespace Database\Seeders;

use App\Models\PurchaseCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchaseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (! $user) {
            $this->command->warn('PurchaseCategorySeeder: no users found, skipping.');

            return;
        }

        $categories = [
            'Groceries',
            'Dining',
            'Miscellaneous',
            'Clothes & Accessories',
            'Adulting',
            'Household Items',
            'Entertainment',
            'Surprises',
            'Gifts',
            'Caprichos',
        ];

        foreach ($categories as $name) {
            PurchaseCategory::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'name' => $name]
            );
        }

        // Migrate the old typo name if present (keep history attached via rename).
        $legacy = PurchaseCategory::withTrashed()
            ->where('user_id', $user->id)
            ->where('name', 'Clothes & Accesories')
            ->first();

        $canonical = PurchaseCategory::withTrashed()
            ->where('user_id', $user->id)
            ->where('name', 'Clothes & Accessories')
            ->first();

        if ($legacy && $canonical && $legacy->id !== $canonical->id) {
            // Point purchases at the canonical category, then remove the typo row.
            $legacy->purchases()->update(['category_id' => $canonical->id]);
            $legacy->forceDelete();
        } elseif ($legacy && ! $canonical) {
            $legacy->update(['name' => 'Clothes & Accessories']);
            if ($legacy->trashed()) {
                $legacy->restore();
            }
        }
    }
}
