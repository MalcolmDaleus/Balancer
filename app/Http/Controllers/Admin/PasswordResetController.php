<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePasswordResetLinkRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $expireMinutes = (int) config('auth.passwords.users.expire');

        $table = config('auth.passwords.users.table');

        $resets = DB::table($table)
            ->join('users', 'users.email', '=', "{$table}.email")
            ->select([
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.email',
                "{$table}.created_at",
            ])
            ->orderByDesc("{$table}.created_at")
            ->get()
            ->map(function (object $row) use ($expireMinutes) {
                $createdAt = Carbon::parse($row->created_at);
                $expiresAt = $createdAt->copy()->addMinutes($expireMinutes);

                return [
                    'user_id' => $row->id,
                    'name' => trim("{$row->first_name} {$row->last_name}"),
                    'email' => $row->email,
                    'created_at' => $createdAt->toIso8601String(),
                    'expires_at' => $expiresAt->toIso8601String(),
                    'expired' => $expiresAt->isPast(),
                ];
            })
            ->values();

        return Inertia::render('admin/password-resets', [
            'resets' => $resets,
            'generated' => $request->session()->get('generated_reset_link'),
            'expire_minutes' => $expireMinutes,
        ]);
    }

    public function store(StorePasswordResetLinkRequest $request): RedirectResponse
    {
        $user = User::where('email', $request->validated('email'))->firstOrFail();

        $token = Password::broker()->createToken($user);
        $expireMinutes = (int) config('auth.passwords.users.expire');

        return redirect()
            ->route('admin.password-resets.index')
            ->with('generated_reset_link', [
                'name' => trim("{$user->first_name} {$user->last_name}"),
                'email' => $user->email,
                'url' => route('password.reset', ['token' => $token, 'email' => $user->email]),
                'expires_at' => now()->addMinutes($expireMinutes)->toIso8601String(),
            ]);
    }

    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('viewAny', User::class);

        Password::broker()->deleteToken($user);

        return redirect()->route('admin.password-resets.index');
    }
}
