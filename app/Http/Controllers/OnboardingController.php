<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompleteOnboardingRequest;
use App\Services\BudgetService;
use App\Services\DateTimeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('onboarding', [
            'replay' => $user->isOnboarded(),
            'currency' => $user->currency ?? 'USD',
            'locale' => $user->locale,
        ]);
    }

    public function store(CompleteOnboardingRequest $request, BudgetService $budgets): RedirectResponse
    {
        $user = $request->user();
        if ($user->isOnboarded()) {
            return redirect()->route('dashboard');
        }

        $data = $request->validated();
        $now = DateTimeService::today();

        $user->forceFill([
            'liquidity_seed' => (int) $data['liquidity_cents'],
            'savings_seed' => (int) $data['savings_cents'],
            'liquidity_seed_on' => $now->toDateString(),
            'onboarded_at' => now(),
        ])->save();

        $discretionary = (int) ($data['discretionary_cents'] ?? 0);
        if ($discretionary > 0) {
            $budgets->upsert($user->id, $now, [
                'discretionary_cents' => $discretionary,
                'envelopes' => [],
            ]);
        }

        return redirect()->route('dashboard');
    }
}
