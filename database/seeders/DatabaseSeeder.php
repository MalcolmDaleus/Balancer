<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            PurchaseCategorySeeder::class,
            DebtCategorySeeder::class,
            RecurringPaymentCategorySeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call(DevDataSeeder::class);
        } else {
            $this->command?->warn('DevDataSeeder skipped outside local. Run --class=DevDataSeeder only if intentional.');
        }
    }
}
