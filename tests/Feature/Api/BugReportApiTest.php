<?php

use App\Enums\BugReportType;
use App\Enums\BugReportView;
use App\Enums\BugReportZone;
use App\Models\BugReport;
use App\Models\User;

test('unauthenticated user cannot submit a bug report', function () {
    $this->postJson('/api/v1/bug-reports', validPayload())->assertStatus(401);
});

test('unverified user cannot submit a bug report', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->postJson('/api/v1/bug-reports', validPayload())
        ->assertStatus(403);
});

test('user can submit a bug report', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/bug-reports', [
        'type' => BugReportType::Functional->value,
        'zone' => BugReportZone::Statistics->value,
        'view' => BugReportView::Mobile->value,
        'description' => 'Compare chart labels are clipped on a phone.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.type', 'functional')
        ->assertJsonPath('data.zone', 'statistics')
        ->assertJsonPath('data.view', 'mobile');

    $this->assertDatabaseHas('bug_reports', [
        'user_id' => $user->id,
        'type' => 'functional',
        'zone' => 'statistics',
        'view' => 'mobile',
    ]);
});

test('store bug report fails without required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/bug-reports', [])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('store bug report rejects unknown zone and type', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/bug-reports', [
        'type' => 'crash',
        'zone' => 'budget',
        'view' => 'tablet',
        'description' => 'This should not persist at all.',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');

    expect(BugReport::query()->count())->toBe(0);
});

test('store bug report rejects a short description', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/bug-reports', [
        ...validPayload(),
        'description' => 'Too short',
    ])
        ->assertStatus(422)
        ->assertJsonPath('error', 'validation_failed');
});

test('bug report is scoped to the authenticated user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/bug-reports', validPayload())
        ->assertCreated();

    expect(BugReport::query()->where('user_id', $user->id)->count())->toBe(1);
    expect(BugReport::query()->where('user_id', $other->id)->count())->toBe(0);
});

function validPayload(): array
{
    return [
        'type' => BugReportType::Visual->value,
        'zone' => BugReportZone::Dashboard->value,
        'view' => BugReportView::Desktop->value,
        'description' => 'The header logo is off-center on a wide screen.',
    ];
}
