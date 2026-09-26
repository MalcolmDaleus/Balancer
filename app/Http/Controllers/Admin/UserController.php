<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', User::class);

        return $this->renderList(adminsOnly: false);
    }

    public function admins(): Response
    {
        $this->authorize('viewAny', User::class);

        return $this->renderList(adminsOnly: true);
    }

    private function renderList(bool $adminsOnly): Response
    {
        $users = User::query()
            ->when($adminsOnly, fn ($query) => $query->where('is_admin', true))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'currency' => $user->currency,
                'locale' => $user->locale,
                'is_admin' => $user->is_admin,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                'onboarded_at' => $user->onboarded_at?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render($adminsOnly ? 'admin/admins' : 'admin/users', [
            'users' => $users,
        ]);
    }
}
