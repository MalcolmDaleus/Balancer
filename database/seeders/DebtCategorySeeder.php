<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DebtCategory;
use App\Models\User;

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
            DebtCategory::firstOrCreate(
                ['user_id' => $user->id, 'name' => $name]
            );
        }
    }
}