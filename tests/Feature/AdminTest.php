<?php

use App\Enums\BugReportStatus;
use App\Models\BugReport;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected away from admin', function () {
    $this->get(route('admin.overview'))->assertRedirect(route('login'));
    $this->get(route('admin.bug-reports.index'))->assertRedirect(route('login'));
    $this->get(route('admin.users.index'))->assertRedirect(route('login'));
    $this->get(route('admin.admins.index'))->assertRedirect(route('login'));
});

test('members cannot open admin pages', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.overview'))->assertForbidden();
    $this->actingAs($user)->get(route('admin.bug-reports.index'))->assertForbidden();
    $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    $this->actingAs($user)->get(route('admin.admins.index'))->assertForbidden();
});

test('members cannot update a bug report status', function () {
    $user = User::factory()->create();
    $report = BugReport::factory()->create();

    $this->actingAs($user)
        ->patch(route('admin.bug-reports.update', $report), ['status' => 'triaged'])
        ->assertForbidden();

    expect($report->refresh()->status)->toBe(BugReportStatus::New);
});

test('admins can open the admin screens', function () {
    $this->withoutVite();
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('admin.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/overview')
            ->has('stats.users')
            ->has('stats.admins')
            ->has('stats.bug_reports')
            ->has('stats.new_bug_reports')
            ->has('recent_reports'));

    $this->actingAs($admin)
        ->get(route('admin.bug-reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/bug-reports')
            ->has('reports.data')
            ->where('filters.status', null));

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users')
            ->has('users.data'));

    $this->actingAs($admin)
        ->get(route('admin.admins.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/admins')
            ->has('users.data'));
});

test('admin users list includes the signed-in admin', function () {
    $this->withoutVite();
    $admin = User::factory()->admin()->create([
        'email' => 'ops@example.com',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.admins.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/admins')
            ->has('users.data', 1)
            ->where('users.data.0.email', 'ops@example.com')
            ->where('users.data.0.is_admin', true));
});

test('admins can filter bug reports by status', function () {
    $this->withoutVite();
    $admin = User::factory()->admin()->create();
    BugReport::factory()->create(['status' => BugReportStatus::New]);
    BugReport::factory()->create(['status' => BugReportStatus::Fixed]);

    $this->actingAs($admin)
        ->get(route('admin.bug-reports.index', ['status' => 'fixed']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/bug-reports')
            ->where('filters.status', 'fixed')
            ->has('reports.data', 1)
            ->where('reports.data.0.status', 'fixed'));
});

test('admins can update a bug report status', function () {
    $admin = User::factory()->admin()->create();
    $report = BugReport::factory()->create(['status' => BugReportStatus::New]);

    $this->actingAs($admin)
        ->from(route('admin.bug-reports.index'))
        ->patch(route('admin.bug-reports.update', $report), ['status' => 'triaged'])
        ->assertRedirect(route('admin.bug-reports.index'));

    expect($report->refresh()->status)->toBe(BugReportStatus::Triaged);
});

test('admin overview counts users and new reports', function () {
    $this->withoutVite();
    $admin = User::factory()->admin()->create();
    User::factory()->count(2)->create();
    BugReport::factory()->create(['user_id' => $admin->id, 'status' => BugReportStatus::New]);
    BugReport::factory()->create(['user_id' => $admin->id, 'status' => BugReportStatus::Fixed]);

    $this->actingAs($admin)
        ->get(route('admin.overview'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/overview')
            ->where('stats.users', 3)
            ->where('stats.admins', 1)
            ->where('stats.bug_reports', 2)
            ->where('stats.new_bug_reports', 1)
            ->has('recent_reports', 2));
});
