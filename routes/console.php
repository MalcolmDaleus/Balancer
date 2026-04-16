<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Commands
|--------------------------------------------------------------------------
|
| Run: php artisan schedule:run  (or register with system cron)
|
*/

// Generate purchases for all active recurring definitions once per day at midnight.
// The --date option is not passed here, so it defaults to today().
// Run 'php artisan purchases:generate-recurring --dry-run' to preview.
Schedule::command('purchases:generate-recurring')
    ->dailyAt('00:05')
    ->withoutOverlapping()
    ->runInBackground();
