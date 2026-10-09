<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia as Assert;

test('members cannot use password reset admin', function () {
    $member = User::factory()->create();
    $target = User::factory()->create();

    $this->actingAs($member)->get(route('admin.password-resets.index'))->assertForbidden();
    $this->actingAs($member)
        ->post(route('admin.password-resets.store'), ['email' => $target->email])
        ->assertForbidden();
    $this->actingAs($member)
        ->delete(route('admin.password-resets.destroy', $target))
        ->assertForbidden();

    expect(DB::table('password_reset_tokens')->count())->toBe(0);
});

test('admin can create a reset link that is shown once and listed', function () {
    $this->withoutVite();
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create(['email' => 'friend@example.com']);

    $response = $this->actingAs($admin)
        ->post(route('admin.password-resets.store'), ['email' => 'friend@example.com']);

    $response->assertRedirect(route('admin.password-resets.index'));
    $generated = session('generated_reset_link');
    expect($generated['email'])->toBe('friend@example.com')
        ->and($generated['url'])->toContain('/reset-password/')
        ->and($generated['url'])->toContain('email=friend%40example.com');

    $this->actingAs($admin)
        ->get(route('admin.password-resets.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/password-resets')
            ->has('resets', 1)
            ->where('resets.0.user_id', $target->id)
            ->where('resets.0.expired', false));
});

test('a generated reset link resets the password', function () {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();

    $this->actingAs($admin)->post(route('admin.password-resets.store'), ['email' => $target->email]);
    $url = session('generated_reset_link')['url'];
    $token = basename(parse_url($url, PHP_URL_PATH));

    auth()->logout();

    $this->post(route('password.store'), [
        'token' => $token,
        'email' => $target->email,
        'password' => 'brand-new-password',
        'password_confirmation' => 'brand-new-password',
    ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

    expect(Hash::check('brand-new-password', $target->refresh()->password))->toBeTrue()
        ->and(DB::table('password_reset_tokens')->count())->toBe(0);
});

test('creating a new link replaces the previous one', function () {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();

    $this->actingAs($admin)->post(route('admin.password-resets.store'), ['email' => $target->email]);
    $first = basename(parse_url(session('generated_reset_link')['url'], PHP_URL_PATH));
    $this->actingAs($admin)->post(route('admin.password-resets.store'), ['email' => $target->email]);

    expect(DB::table('password_reset_tokens')->count())->toBe(1)
        ->and(Password::broker()->tokenExists($target, $first))->toBeFalse();
});

test('admin can revoke a reset link', function () {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();
    Password::broker()->createToken($target);

    $this->actingAs($admin)
        ->delete(route('admin.password-resets.destroy', $target))
        ->assertRedirect(route('admin.password-resets.index'));

    expect(DB::table('password_reset_tokens')->count())->toBe(0);
});

test('unknown email is rejected', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post(route('admin.password-resets.store'), ['email' => 'nobody@example.com'])
        ->assertSessionHasErrors('email');
});
