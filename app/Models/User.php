<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'currency',
        'locale',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_finance_processed_at' => 'datetime',
        ];
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function debts(): HasMany
    {
        return $this->hasMany(Debt::class);
    }

    public function savings(): HasMany
    {
        return $this->hasMany(Saving::class);
    }

    public function incomeEntries(): HasMany
    {
        return $this->hasMany(IncomeEntry::class);
    }

    public function regularIncomeSchedules(): HasMany
    {
        return $this->hasMany(RegularIncomeSchedule::class);
    }

    public function regularIncomeScheduleVersions(): HasMany
    {
        return $this->hasMany(RegularIncomeScheduleVersion::class);
    }

    public function balanceSheets(): HasMany
    {
        return $this->hasMany(BalanceSheetTotal::class);
    }

    public function debtPayments(): HasMany
    {
        return $this->hasMany(DebtPayment::class);
    }

    public function recurringPaymentCategories(): HasMany
    {
        return $this->hasMany(RecurringPaymentCategory::class);
    }

    public function recurringPaymentStreams(): HasMany
    {
        return $this->hasMany(RecurringPaymentStream::class);
    }

    public function recurringPaymentEntries(): HasMany
    {
        return $this->hasMany(RecurringPaymentEntry::class);
    }

    public function recurringCharges(): HasMany
    {
        return $this->hasMany(RecurringCharge::class);
    }

    public function recurringOccurrenceSkips(): HasMany
    {
        return $this->hasMany(RecurringOccurrenceSkip::class);
    }
}
