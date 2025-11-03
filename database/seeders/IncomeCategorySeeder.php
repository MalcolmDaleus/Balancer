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

        $categories = ['Employment', 'Contract', 'Gift', 'Refund'];

        foreach ($categories as $name) {
            IncomeCategory::firstOrCreate(
                ['user_id' => $user->id, 'category_name' => $name]
            );
        }
    }
}