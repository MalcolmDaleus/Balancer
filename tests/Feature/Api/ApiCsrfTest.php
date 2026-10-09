<?php

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

beforeEach(function () {
    // The real middleware skips itself under PHPUnit; this copy doesn't.
    $this->app->instance(ValidateCsrfToken::class, new class($this->app, $this->app['encrypter']) extends ValidateCsrfToken
    {
        protected function runningUnitTests()
        {
            return false;
        }
    });
});

test('api writes without a csrf token are rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/categories/purchases', ['name' => 'Snacks'])
        ->assertStatus(419);
});

test('api writes with the session csrf token succeed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['_token' => 'test-token'])
        ->withHeader('X-CSRF-TOKEN', 'test-token')
        ->postJson('/api/v1/categories/purchases', ['name' => 'Snacks'])
        ->assertCreated();
});

test('api reads do not need a csrf token', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/categories/purchases')->assertOk();
});
