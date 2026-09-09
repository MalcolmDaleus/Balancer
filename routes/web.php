<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocalDevController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'show'])->name('onboarding');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::get('dashboard', DashboardController::class)->middleware('onboarded')->name('dashboard');
    Route::post('dev/reset-onboarding', [LocalDevController::class, 'resetOnboarding'])->name('dev.reset-onboarding');
    Route::post('dev/load-demo', [LocalDevController::class, 'loadDemo'])->name('dev.load-demo');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
