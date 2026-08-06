<?php

namespace App\Http\Controllers;

use App\Services\DateTimeService;
use App\Services\FinanceProcessingService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DashboardController extends Controller
{
    /** Session marker: YYYY-MM-DD of last successful catch-up sync. */
    private const SESSION_KEY = 'finance_synced_for';

    /**
     * Temporary pre-host catch-up: at most once per calendar day per session.
     * Failures are reported and do not block the dashboard render.
     * When server cron is live, remove this block entirely.
     */
    public function __invoke(Request $request, FinanceProcessingService $finance): Response
    {
        $closedMonths = [];
        $today = DateTimeService::today()->toDateString();

        if ($request->session()->get(self::SESSION_KEY) !== $today) {
            try {
                $result = $finance->syncUser($request->user()->id);

                if (! $result['skipped']) {
                    $closedMonths = $result['closed_months'];
                    $request->session()->put(self::SESSION_KEY, $today);
                }
            } catch (Throwable $e) {
                report($e);
            }
        }

        return Inertia::render('dashboard', [
            'closedMonths' => $closedMonths,
        ]);
    }
}
