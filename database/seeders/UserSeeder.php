<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('UserSeeder contains a known password and only runs in local or testing.');
        }

        $user = User::firstOrCreate(
            ['email' => 'test@test.com'],
            [
                'first_name' => 'Malcolm',
                'last_name' => 'Daleus',
                'password' => bcrypt('password123'),
                'currency' => 'EUR',
                'locale' => 'en-US',
                'email_verified_at' => now(),
            ]
        );

        // Fill gaps only — do not overwrite existing identity/profile values.
        $gaps = [];

        if (blank($user->locale)) {
            $gaps['locale'] = 'en-US';
        }

        if (! $user->is_admin) {
            $gaps['is_admin'] = true;
        }

        if ($gaps !== []) {
            $user->forceFill($gaps)->save();
        }
    }
}
