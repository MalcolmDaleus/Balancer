<?php

use App\Http\Controllers\BalanceSheetTotalController;
use App\Http\Controllers\DebtCategoryController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\DebtPaymentController;
use App\Http\Controllers\FinanceSyncController;
use App\Http\Controllers\IncomeEntryController;
use App\Http\Controllers\PurchaseCategoryController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\RegularIncomeScheduleController;
use App\Http\Controllers\RecurringChargeController;
use App\Http\Controllers\RecurringPaymentCategoryController;
use App\Http\Controllers\RecurringPaymentEntryController;
use App\Http\Controllers\RecurringPaymentStreamController;
use App\Http\Controllers\SavingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('v1')->name('api.v1.')->group(function () {

    // ---------------------------------------------------------------
    // Purchases + Refund action
    // ---------------------------------------------------------------
    Route::apiResource('purchases', PurchaseController::class);
    Route::post('purchases/{purchase}/refund', [PurchaseController::class, 'refund'])
        ->name('purchases.refund');

    // ---------------------------------------------------------------
    // Debts + nested payments + Forgive action
    // ---------------------------------------------------------------
    Route::apiResource('debts', DebtController::class);
    Route::post('debts/{debt}/forgive', [DebtController::class, 'forgive'])
        ->name('debts.forgive');

    Route::get('debts/{debt}/payments', [DebtPaymentController::class, 'index'])
        ->name('debts.payments.index');
    Route::post('debts/{debt}/payments', [DebtPaymentController::class, 'store'])
        ->name('debts.payments.store');
    Route::get('debt-payments/{debtPayment}', [DebtPaymentController::class, 'show'])
        ->name('debt-payments.show');
    Route::put('debt-payments/{debtPayment}', [DebtPaymentController::class, 'update'])
        ->name('debt-payments.update');
    Route::patch('debt-payments/{debtPayment}', [DebtPaymentController::class, 'update'])
        ->name('debt-payments.update.patch');
    Route::delete('debt-payments/{debtPayment}', [DebtPaymentController::class, 'destroy'])
        ->name('debt-payments.destroy');

    // ---------------------------------------------------------------
    // Income schedules + entries
    // ---------------------------------------------------------------
    Route::apiResource('income/schedules', RegularIncomeScheduleController::class)
        ->parameters(['schedules' => 'regularIncomeSchedule']);
    Route::post('income/schedules/{regularIncomeSchedule}/update-amount', [RegularIncomeScheduleController::class, 'updateAmount'])
        ->name('income.schedules.update-amount');
    Route::patch('income/schedules/{regularIncomeSchedule}/toggle', [RegularIncomeScheduleController::class, 'toggle'])
        ->name('income.schedules.toggle');
    Route::patch('income/schedules/{id}/restore', [RegularIncomeScheduleController::class, 'restore'])
        ->name('income.schedules.restore');
    Route::delete('income/schedules/{id}/force', [RegularIncomeScheduleController::class, 'hardDestroy'])
        ->name('income.schedules.force-delete');
    Route::apiResource('income/entries', IncomeEntryController::class)
        ->parameters(['entries' => 'incomeEntry']);

    // ---------------------------------------------------------------
    // Savings
    // ---------------------------------------------------------------
    Route::apiResource('savings', SavingController::class);

    // ---------------------------------------------------------------
    // Categories
    // ---------------------------------------------------------------
    Route::apiResource('categories/purchases', PurchaseCategoryController::class)
        ->parameters(['purchases' => 'purchaseCategory']);
    Route::apiResource('categories/debts', DebtCategoryController::class)
        ->parameters(['debts' => 'debtCategory']);

    // ---------------------------------------------------------------
    // Recurring payments (streams + entries + categories)
    // ---------------------------------------------------------------
    Route::apiResource('recurring-payments/categories', RecurringPaymentCategoryController::class)
        ->parameters(['categories' => 'recurringPaymentCategory']);
    Route::apiResource('recurring-payments/streams', RecurringPaymentStreamController::class)
        ->parameters(['streams' => 'recurringPaymentStream']);
    Route::post('recurring-payments/streams/{recurringPaymentStream}/update-price', [RecurringPaymentStreamController::class, 'updatePrice'])
        ->name('recurring-payments.streams.update-price');
    Route::patch('recurring-payments/streams/{recurringPaymentStream}/toggle', [RecurringPaymentStreamController::class, 'toggle'])
        ->name('recurring-payments.streams.toggle');
    Route::patch('recurring-payments/streams/{id}/restore', [RecurringPaymentStreamController::class, 'restore'])
        ->name('recurring-payments.streams.restore');
    Route::delete('recurring-payments/streams/{id}/force', [RecurringPaymentStreamController::class, 'hardDestroy'])
        ->name('recurring-payments.streams.force-delete');
    Route::apiResource('recurring-payments/entries', RecurringPaymentEntryController::class)
        ->parameters(['entries' => 'recurringPaymentEntry']);
    Route::apiResource('recurring-payments/charges', RecurringChargeController::class)
        ->only(['index', 'show', 'destroy'])
        ->parameters(['charges' => 'recurringCharge']);

    // ---------------------------------------------------------------
    // Finance catch-up (cron is primary; this is explicit / pre-host safety)
    // ---------------------------------------------------------------
    Route::post('finance/sync', FinanceSyncController::class)->name('finance.sync');

    // ---------------------------------------------------------------
    // Balance sheet
    // ---------------------------------------------------------------
    Route::prefix('balance-sheet')->name('balance-sheet.')->group(function () {
        Route::get('/', [BalanceSheetTotalController::class, 'expanded'])->name('expanded');
        Route::get('/locked-months', [BalanceSheetTotalController::class, 'lockedMonths'])->name('locked-months');
        Route::get('/summary', [BalanceSheetTotalController::class, 'summary'])->name('summary');
        Route::post('/close', [BalanceSheetTotalController::class, 'close'])->name('close');
        Route::get('/history', [BalanceSheetTotalController::class, 'history'])->name('history');
        Route::get('/compare', [BalanceSheetTotalController::class, 'compare'])->name('compare');
        Route::delete('/{balanceSheetTotal}', [BalanceSheetTotalController::class, 'destroy'])->name('destroy');
    });
});
