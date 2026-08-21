<?php

namespace Database\Seeders;

use App\Models\DebtCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class DebtCategorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (! $user) {
            $this->command->warn('DebtCategorySeeder: no users found, skipping.');

            return;
        }

        $categories = ['Personal', 'Loan', 'Payment Plan'];

        foreach ($categories as $name) {
            DebtCategory::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'name' => $name]
            );
        }
    }
}
