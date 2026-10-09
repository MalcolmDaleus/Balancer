<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->error('Seeding is disabled outside local. Create accounts by registering instead.');

            return;
        }

        $this->call([
            UserSeeder::class,
            PurchaseCategorySeeder::class,
            DebtCategorySeeder::class,
            RecurringPaymentCategorySeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DevDataSeeder::class);
        }
    }
}
