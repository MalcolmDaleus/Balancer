<?php

use App\Models\User;
use Database\Seeders\UserSeeder;
use Illuminate\Support\Facades\Hash;

test('user seeder marks the seed account as an admin', function () {
    $this->seed(UserSeeder::class);

    $user = User::query()->where('email', 'mdaleus21@gmail.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->is_admin)->toBeTrue()
        ->and($user->isAdmin())->toBeTrue();
});

test('user seeder promotes an existing seed account without overwriting identity', function () {
    $user = User::factory()->create([
        'email' => 'mdaleus21@gmail.com',
        'first_name' => 'Keep',
        'last_name' => 'Me',
        'currency' => 'USD',
        'locale' => 'nl-NL',
        'is_admin' => false,
    ]);
    $passwordHash = $user->password;

    $this->seed(UserSeeder::class);

    $user->refresh();

    expect($user->is_admin)->toBeTrue()
        ->and($user->first_name)->toBe('Keep')
        ->and($user->last_name)->toBe('Me')
        ->and($user->currency)->toBe('USD')
        ->and($user->locale)->toBe('nl-NL')
        ->and($user->password)->toBe($passwordHash)
        ->and(Hash::check('password', $user->password))->toBeTrue();
});

test('factory users are not admins by default', function () {
    $user = User::factory()->create();

    expect($user->is_admin)->toBeFalse()
        ->and($user->isAdmin())->toBeFalse();
});
