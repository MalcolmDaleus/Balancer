<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Product shell. Finance processing is cron-primary
     * (`finance:process-due` / `finance:close-months`); use
     * `POST /api/v1/finance/sync` or `php artisan finance:sync --user=` for manual catch-up.
     */
    public function __invoke(Request $request): Response
    {
        return Inertia::render('dashboard');
    }
}
