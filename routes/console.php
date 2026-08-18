<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Scheduled finance commands
|--------------------------------------------------------------------------
|
| Host cron (required in production):
|   * * * * * cd /path/to/app && php artisan schedule:run >> /dev/null 2>&1
|
| Manual catch-up for one user:
|   php artisan finance:sync --user=1
|
| See project_notes/ops_cron.md
|
*/

Schedule::command('finance:process-due')->dailyAt('00:10')->withoutOverlapping();
Schedule::command('finance:close-months')->dailyAt('00:30')->withoutOverlapping();
