<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    // Settings UI is the dashboard drawer; GET routes only deep-link into it.
    Route::redirect('settings', '/dashboard?settings=1');

    Route::get('settings/profile', fn () => redirect('/dashboard?settings=1'))->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', fn () => redirect('/dashboard?settings=1'))->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', fn () => redirect('/dashboard?settings=1'))->name('appearance');
});
