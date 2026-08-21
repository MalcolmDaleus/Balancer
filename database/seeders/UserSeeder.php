<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'mdaleus21@gmail.com'],
            [
                'first_name' => 'Malcolm',
                'last_name' => 'Daleus',
                'password' => bcrypt('peanut12'),
                'currency' => 'EUR',
                'locale' => 'en-US',
                'email_verified_at' => now(),
            ]
        );

        // Fill gaps only — do not overwrite existing identity/profile values.
        $gaps = [];

        if ($user->email_verified_at === null) {
            $gaps['email_verified_at'] = now();
        }

        if (blank($user->locale)) {
            $gaps['locale'] = 'en-US';
        }

        if ($gaps !== []) {
            $user->forceFill($gaps)->save();
        }
    }
}
