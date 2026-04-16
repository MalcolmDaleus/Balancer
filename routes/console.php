<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
||--------------------------------------------------------------------------
|| Scheduled Commands
||--------------------------------------------------------------------------
||
|| Run: php artisan schedule:run  (or register with system cron)
||
|| Note: Recurring payments are modelled as RecurringPaymentEntry records
|| and surfaced directly by BalanceSheetService — no daily command is needed
|| to generate purchase rows from them.
||
|*/
