<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\IncomeCategory;
use App\Models\User;

class IncomeCategorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (! $user) {
            $this->command->warn('IncomeCategorySeeder: no users found, skipping.');
            return;
        }

        $categories = ['Employment', 'Contract', 'Gift', 'Refund'];

        foreach ($categories as $name) {
            IncomeCategory::firstOrCreate(
                ['user_id' => $user->id, 'category_name' => $name]
            );
        }
    }
}