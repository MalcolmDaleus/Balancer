<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    config(['app.debug' => false]);
});

test('unknown pages render the branded 404', function () {
    $this->get('/definitely-not-a-page')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 404));
});

test('forbidden pages render the branded 403', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('admin.overview'))
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 403));
});

test('api errors stay json', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/purchases/999999')
        ->assertNotFound()
        ->assertJsonPath('error', 'not_found');
});

test('debug mode keeps the default error output', function () {
    config(['app.debug' => true]);

    $response = $this->get('/definitely-not-a-page')->assertNotFound();

    expect($response->headers->get('X-Inertia'))->toBeNull()
        ->and($response->getContent())->not->toContain('"component":"error"');
});

test('legal pages are public', function () {
    $this->get(route('privacy'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('legal')->where('document', 'privacy'));

    $this->get(route('terms'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('legal')->where('document', 'terms'));
});
