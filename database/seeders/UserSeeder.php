<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Only create if not exists
        User::firstOrCreate(
            ['email' => 'mdaleus21@gmail.com'],
            [
                'first_name' => 'Malcolm',
                'last_name' => 'Daleus',
                'password' => bcrypt('peanut12'), 
                'currency' => 'EUR'
            ]
        );
    }
}