<?php

namespace Database\Seeders;

use App\Models\IncomeCategory;
use App\Models\IncomeStream;
use App\Models\User;
use Illuminate\Database\Seeder;

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
            IncomeCategory::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'category_name' => $name]
            );
        }

        // Create the system-managed "Refunds" stream, used automatically when a
        // purchase is marked as refunded.  is_system = true hides it from the
        // income-entry editor so users can't accidentally assign entries to it.
        $refundCategory = IncomeCategory::where('user_id', $user->id)
            ->where('category_name', 'Refund')
            ->first();

        if ($refundCategory) {
            IncomeStream::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'name' => 'Refunds'],
                [
                    'category_id' => $refundCategory->id,
                    'description' => 'Auto-generated refund income entries.',
                    'is_system'   => true,
                ]
            );
        }
    }
}
