<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can visit the landing page', function () {
    $this->withoutVite()
        ->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('welcome'));
});

test('authenticated users still see the landing page', function () {
    $this->withoutVite();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('welcome'));
});

test('guests cannot visit the dashboard', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});
