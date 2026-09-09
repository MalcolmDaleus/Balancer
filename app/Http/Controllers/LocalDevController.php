<?php

namespace App\Http\Controllers;

use Database\Seeders\DevDataSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocalDevController extends Controller
{
    public function resetOnboarding(Request $request): RedirectResponse
    {
        $this->ensureLocalDev();

        $user = $request->user();
        app(DevDataSeeder::class)->wipeFinancialData($user);
        $user->forceFill([
            'liquidity_seed' => 0,
            'savings_seed' => 0,
            'liquidity_seed_on' => null,
            'onboarded_at' => null,
        ])->save();

        return redirect()->route('onboarding');
    }

    public function loadDemo(Request $request): RedirectResponse
    {
        $this->ensureLocalDev();

        app(DevDataSeeder::class)->rebuildFor($request->user());

        return redirect()->route('dashboard');
    }

    private function ensureLocalDev(): void
    {
        if (! app()->environment('local') && ! app()->runningUnitTests()) {
            abort(404);
        }
    }
}
