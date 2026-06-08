<?php

namespace App\Http\Controllers;

use App\Services\AutoMonthCloseService;
use App\Services\DateTimeService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const SESSION_KEY = 'auto_close_checked_for';

    public function __invoke(Request $request, AutoMonthCloseService $autoClose): Response
    {
        $closedMonths = [];

        $currentMonth = DateTimeService::normalizeMonth()->format('Y-m');

        if ($request->session()->get(self::SESSION_KEY) !== $currentMonth) {
            $closedMonths = $autoClose->closePendingMonths($request->user()->id);
            $request->session()->put(self::SESSION_KEY, $currentMonth);
        }

        return Inertia::render('dashboard', [
            'closedMonths' => $closedMonths,
        ]);
    }
}
