<?php

use App\Http\Controllers\Admin\BugReportController;
use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\PasswordResetController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'onboarded', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', OverviewController::class)->name('overview');
        Route::get('bug-reports', [BugReportController::class, 'index'])->name('bug-reports.index');
        Route::patch('bug-reports/{bugReport}', [BugReportController::class, 'update'])->name('bug-reports.update');
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::get('admins', [UserController::class, 'admins'])->name('admins.index');
        Route::get('password-resets', [PasswordResetController::class, 'index'])->name('password-resets.index');
        Route::post('password-resets', [PasswordResetController::class, 'store'])->name('password-resets.store');
        Route::delete('password-resets/{user}', [PasswordResetController::class, 'destroy'])->name('password-resets.destroy');
    });
