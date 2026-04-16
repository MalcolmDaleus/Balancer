<?php

namespace Database\Seeders;

use App\Models\RecurringPaymentCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class RecurringPaymentCategorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (! $user) {
            $this->command->warn('RecurringPaymentCategorySeeder: no users found, skipping.');
            return;
        }

        $categories = [
            'Rent / Mortgage',
            'Utilities',
            'Online Subscription',
            'Insurance',
            'Loan Repayment',
            'Gym / Health',
            'Phone / Internet',
            'Transportation',
        ];

        foreach ($categories as $name) {
            RecurringPaymentCategory::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'name' => $name]
            );
        }
    }
}
