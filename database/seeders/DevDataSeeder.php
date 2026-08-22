<?php

namespace Database\Seeders;

use App\Enums\IncomeEntryType;
use App\Models\BalanceSheetTotal;
use App\Models\Debt;
use App\Models\DebtCategory;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringCharge;
use App\Models\RecurringOccurrenceSkip;
use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\Saving;
use App\Models\User;
use App\Services\DebtSettlementService;
use App\Services\FinanceProcessingService;
use App\Services\PurchaseRefundService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Local-only demo dataset for the first user (~24 months).
 *
 * Instruments + discretionary Facts are seeded; regular income and recurring
 * charges are materialized via FinanceProcessingService (one processDue per month).
 * Does not change the user identity fields.
 */
class DevDataSeeder extends Seeder
{
    private const HORIZON_MONTHS = 24;

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->error('DevDataSeeder refused: only runs in the local environment.');

            return;
        }

        $user = User::first();

        if (! $user) {
            $this->command->error('DevDataSeeder: no user found. Run UserSeeder first.');

            return;
        }

        $this->command->info("Rebuilding demo data for: {$user->email}");

        $gaps = [];
        if ($user->email_verified_at === null) {
            $gaps['email_verified_at'] = now();
        }
        if (blank($user->locale)) {
            $gaps['locale'] = 'en-US';
        }
        if ($gaps !== []) {
            $user->forceFill($gaps)->save();
        }

        $this->clearFinancialData($user);
        $this->callCategorySeeders();

        $now = Carbon::now()->startOfDay();
        $thisMonth = $now->copy()->startOfMonth();
        $lastMonth = $now->copy()->subMonthNoOverflow()->startOfMonth();
        $months = $this->monthStarts($thisMonth);
        $origin = $months[0];

        $this->seedIncomeInstruments($user, $origin);
        $this->seedPurchases($user, $months);
        $this->seedRefund($user, $lastMonth, $months[count($months) - 3] ?? $origin);
        $this->seedDebts($user, $thisMonth, $lastMonth, $origin, $months);
        $this->seedSavings($user, $months);
        $this->seedRecurring($user, $origin);

        $this->command->line('  → Materializing income & recurring (process-due per month)');
        $finance = app(FinanceProcessingService::class);
        $historical = array_slice($months, 0, -1);
        foreach ($historical as $month) {
            $finance->processDueForUser($user->id, $month->copy()->startOfMonth());
        }

        $this->bumpNetflix($user, $thisMonth, $lastMonth);
        $finance->processDueForUser($user->id, $thisMonth);

        $this->jitterFreelance($user, $thisMonth);
        $this->seedIrregularIncome($user, $thisMonth, $lastMonth, $months);

        $this->command->line('  → Closing backlog');
        $closed = $finance->closeMonthsForUser($user->id) ?? [];
        foreach ($closed as $ym) {
            $this->command->line("     Closed {$ym}");
        }

        $this->command->info('✓ Dev data rebuilt ('.count($months).' months).');
        $this->command->line('  Open dashboard or GET /api/v1/balance-sheet?month='.$thisMonth->format('Y-m'));
    }

    /**
     * @return list<Carbon>
     */
    private function monthStarts(Carbon $thisMonth): array
    {
        $months = [];
        for ($i = self::HORIZON_MONTHS - 1; $i >= 0; $i--) {
            $months[] = $thisMonth->copy()->subMonthsNoOverflow($i)->startOfMonth();
        }

        return $months;
    }

    private function clearFinancialData(User $user): void
    {
        $this->command->line('  → Clearing previous financial rows for this user');

        DB::transaction(function () use ($user) {
            RecurringCharge::where('user_id', $user->id)->delete();
            RecurringOccurrenceSkip::where('user_id', $user->id)->delete();
            IncomeEntry::where('user_id', $user->id)->delete();
            Purchase::where('user_id', $user->id)->delete();
            DebtPayment::where('user_id', $user->id)->delete();
            Debt::withTrashed()->where('user_id', $user->id)->forceDelete();
            Saving::where('user_id', $user->id)->delete();
            BalanceSheetTotal::where('user_id', $user->id)->delete();

            RecurringPaymentEntry::withTrashed()->where('user_id', $user->id)->forceDelete();
            RecurringPaymentStream::withTrashed()->where('user_id', $user->id)->forceDelete();
            RegularIncomeScheduleVersion::where('user_id', $user->id)->delete();
            RegularIncomeSchedule::withTrashed()->where('user_id', $user->id)->forceDelete();

            PurchaseCategory::withTrashed()->where('user_id', $user->id)->forceDelete();
            DebtCategory::withTrashed()->where('user_id', $user->id)->forceDelete();
            RecurringPaymentCategory::withTrashed()->where('user_id', $user->id)->forceDelete();
        });
    }

    private function callCategorySeeders(): void
    {
        $this->call([
            PurchaseCategorySeeder::class,
            DebtCategorySeeder::class,
            RecurringPaymentCategorySeeder::class,
        ]);
    }

    private function seedIncomeInstruments(User $user, Carbon $origin): void
    {
        $this->command->line('  → Income schedules');

        $salary = RegularIncomeSchedule::create([
            'user_id' => $user->id,
            'name' => 'Main Salary',
            'description' => 'Primary full-time employment income',
            'active' => true,
        ]);

        RegularIncomeScheduleVersion::create([
            'user_id' => $user->id,
            'regular_schedule_id' => $salary->id,
            'amount' => 2400.00,
            'frequency' => 'monthly',
            'day_of_month' => 1,
            'start_date' => $origin->toDateString(),
            'active' => true,
        ]);

        $freelance = RegularIncomeSchedule::create([
            'user_id' => $user->id,
            'name' => 'Freelance',
            'description' => 'Side contract work',
            'active' => true,
        ]);

        RegularIncomeScheduleVersion::create([
            'user_id' => $user->id,
            'regular_schedule_id' => $freelance->id,
            'amount' => 500.00,
            'frequency' => 'monthly',
            'day_of_month' => 15,
            'start_date' => $origin->toDateString(),
            'active' => true,
        ]);
    }

    /**
     * @param  list<Carbon>  $months
     */
    private function seedPurchases(User $user, array $months): void
    {
        $this->command->line('  → Purchases ('.count($months).' months)');

        $cats = PurchaseCategory::where('user_id', $user->id)->get()->keyBy('name');

        $mk = function (string $catName, string $desc, float $amount, Carbon $date) use ($user, $cats): void {
            $cat = $cats->get($catName);
            if (! $cat) {
                return;
            }

            Purchase::create([
                'user_id' => $user->id,
                'category_id' => $cat->id,
                'description' => $desc,
                'amount' => round($amount, 2),
                'date' => $date->toDateTimeString(),
            ]);
        };

        foreach ($months as $i => $month) {
            $endDay = $month->copy()->endOfMonth()->day;
            $clamp = fn (int $d) => min($d, $endDay);

            $g1 = 82 + (($i * 7) % 18) + ($i % 3) * 0.4;
            $g2 = 88 + (($i * 5) % 16);
            $g3 = 28 + (($i * 3) % 12);
            $mk('Groceries', 'Lidl weekly shop', $g1, $month->copy()->addDays($clamp(3) - 1));
            $mk('Groceries', 'Mercadona weekly shop', $g2, $month->copy()->addDays($clamp(10) - 1));
            $mk('Groceries', 'Lidl top-up', $g3, $month->copy()->addDays($clamp(17) - 1));

            $mk('Dining', 'Lunch / coffee', 9.5 + ($i % 5) * 1.2, $month->copy()->addDays($clamp(6) - 1));
            $mk('Dining', $i % 2 === 0 ? 'Dinner out' : 'Pizza Friday', 22 + ($i % 7) * 3.5, $month->copy()->addDays($clamp(14) - 1));

            $mk('Adulting', 'Electricity bill', 52 + ($i % 8) * 2.1, $month->copy()->addDays($clamp(5) - 1));

            if ($i % 2 === 1) {
                $mk('Entertainment', $i % 4 === 1 ? 'Cinema tickets' : 'Concert / show', 18 + ($i % 6) * 7, $month->copy()->addDays($clamp(12) - 1));
            }

            if ($i % 5 === 2) {
                $mk('Miscellaneous', 'Amazon / pharmacy', 12 + ($i % 9) * 2.5, $month->copy()->addDays($clamp(16) - 1));
            }

            if ($i % 7 === 3) {
                $mk('Clothes & Accessories', 'Seasonal clothes', 45 + ($i % 4) * 15, $month->copy()->addDays($clamp(20) - 1));
            }

            if ($i % 11 === 4) {
                $mk('Household Items', 'Home supplies', 28 + ($i % 5) * 6, $month->copy()->addDays($clamp(11) - 1));
            }

            // December / late-year bump
            if ((int) $month->month === 12) {
                $mk('Gifts', 'Holiday gifts', 120 + ($i % 3) * 20, $month->copy()->addDays($clamp(18) - 1));
                $mk('Caprichos', 'Year-end treat', 55, $month->copy()->addDays($clamp(22) - 1));
            }

            // One heavier adulting month
            if ($i === count($months) - 8) {
                $mk('Adulting', 'Car service / ITV', 155.00, $month->copy()->addDays($clamp(21) - 1));
            }
        }

        $mk('Dining', 'Date night dinner', 67.50, $months[count($months) - 1]->copy()->addDays(5));
        $mk('Clothes & Accessories', 'Zara jacket', 89.95, $months[count($months) - 2]->copy()->addDays(min(22, $months[count($months) - 2]->daysInMonth)));
    }

    private function seedRefund(User $user, Carbon $refundMonth, Carbon $purchaseMonth): void
    {
        $this->command->line('  → Refunded purchase');

        $misc = PurchaseCategory::where('user_id', $user->id)->where('name', 'Miscellaneous')->first();
        if (! $misc) {
            return;
        }

        $purchase = Purchase::create([
            'user_id' => $user->id,
            'category_id' => $misc->id,
            'description' => 'Faulty headphones',
            'amount' => 49.99,
            'date' => $purchaseMonth->copy()->addDays(19)->toDateTimeString(),
            'is_refunded' => false,
        ]);

        app(PurchaseRefundService::class)->refund(
            $purchase,
            (int) $user->id,
            49.99,
            $refundMonth->copy()->addDays(3)->toDateString(),
        );
    }

    /**
     * @param  list<Carbon>  $months
     */
    private function seedDebts(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $origin, array $months): void
    {
        $this->command->line('  → Debts');

        $settlement = app(DebtSettlementService::class);
        $loanCat = DebtCategory::where('user_id', $user->id)->where('name', 'Loan')->first();
        $personalCat = DebtCategory::where('user_id', $user->id)->where('name', 'Personal')->first();

        $earlyPaid = $months[2] ?? $origin;
        $earlyFinal = $months[3] ?? $earlyPaid;

        $bank = Debt::create([
            'user_id' => $user->id,
            'category_id' => $loanCat?->id,
            'description' => 'Bank micro-loan',
            'amount' => 300.00,
            'issue_date' => $origin->copy()->addDays(1)->toDateTimeString(),
            'notes' => 'Short-term loan — paid off early in the history',
        ]);
        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $bank->id,
            'amount' => 150.00,
            'paid_at' => $earlyPaid->copy()->addDays(20)->toDateTimeString(),
        ]);
        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $bank->id,
            'amount' => 150.00,
            'paid_at' => $earlyFinal->copy()->addDays(5)->toDateTimeString(),
            'notes' => 'Final payment',
        ]);
        $settlement->sync($bank);

        $laptopStart = $months[count($months) - 6] ?? $origin;
        $laptop = Debt::create([
            'user_id' => $user->id,
            'category_id' => $personalCat?->id,
            'description' => 'Laptop loan from friend',
            'amount' => 600.00,
            'issue_date' => $laptopStart->copy()->addDays(1)->toDateTimeString(),
            'notes' => 'Interest-free, paying back gradually',
        ]);
        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $laptop->id,
            'amount' => 200.00,
            'paid_at' => $lastMonth->copy()->addDays(15)->toDateTimeString(),
            'notes' => 'First instalment',
        ]);
        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $laptop->id,
            'amount' => 200.00,
            'paid_at' => $thisMonth->copy()->addDays(2)->toDateTimeString(),
            'notes' => 'Second instalment',
        ]);
        $settlement->sync($laptop);

        $forgiveMonth = $months[4] ?? $lastMonth;
        Debt::create([
            'user_id' => $user->id,
            'category_id' => $personalCat?->id,
            'description' => 'Old gym debt (forgiven)',
            'amount' => 120.00,
            'issue_date' => $origin->copy()->addDays(1)->toDateTimeString(),
            'notes' => 'Friend said forget it',
            'is_forgiven' => true,
            'settle_date' => $forgiveMonth->copy()->addDays(min(25, $forgiveMonth->daysInMonth))->toDateTimeString(),
        ]);
    }

    /**
     * @param  list<Carbon>  $months
     */
    private function seedSavings(User $user, array $months): void
    {
        $this->command->line('  → Savings');

        foreach ($months as $i => $month) {
            $amount = 200 + (($i * 13) % 80);
            if ($i === count($months) - 1) {
                $amount = 150;
            }

            Saving::create([
                'user_id' => $user->id,
                'month' => $month->toDateString(),
                'type' => 'deposit',
                'amount' => $amount,
                'notes' => 'Monthly savings transfer',
            ]);
        }

        $raid = $months[count($months) - 2] ?? $months[0];
        Saving::create([
            'user_id' => $user->id,
            'month' => $raid->toDateString(),
            'type' => 'withdrawal',
            'amount' => 50.00,
            'notes' => 'Emergency withdrawal',
        ]);

        $extraRaid = $months[count($months) - 9] ?? null;
        if ($extraRaid) {
            Saving::create([
                'user_id' => $user->id,
                'month' => $extraRaid->toDateString(),
                'type' => 'withdrawal',
                'amount' => 80.00,
                'notes' => 'Holiday cash',
            ]);
        }
    }

    private function seedRecurring(User $user, Carbon $origin): void
    {
        $this->command->line('  → Recurring streams');

        $cats = RecurringPaymentCategory::where('user_id', $user->id)->get()->keyBy('name');

        $defs = [
            ['name' => 'Netflix', 'category' => 'Online Subscription', 'amount' => 15.99, 'frequency' => 'monthly', 'day_of_month' => 12],
            ['name' => 'Spotify', 'category' => 'Online Subscription', 'amount' => 10.99, 'frequency' => 'monthly', 'day_of_month' => 1],
            ['name' => 'Apartment Rent', 'category' => 'Rent / Mortgage', 'amount' => 750.00, 'frequency' => 'monthly', 'day_of_month' => 1],
            ['name' => 'Gym Membership', 'category' => 'Gym / Health', 'amount' => 35.00, 'frequency' => 'monthly', 'day_of_month' => 5],
            ['name' => 'Phone Plan', 'category' => 'Phone / Internet', 'amount' => 28.00, 'frequency' => 'monthly', 'day_of_month' => 18],
            ['name' => 'Weekend parking', 'category' => 'Transportation', 'amount' => 40.00, 'frequency' => 'weekly', 'day_of_week' => 6],
        ];

        foreach ($defs as $def) {
            $category = $cats->get($def['category']);
            if (! $category) {
                continue;
            }

            $stream = RecurringPaymentStream::create([
                'user_id' => $user->id,
                'recurring_payment_category_id' => $category->id,
                'name' => $def['name'],
                'active' => true,
            ]);

            RecurringPaymentEntry::create([
                'user_id' => $user->id,
                'recurring_payment_stream_id' => $stream->id,
                'amount' => $def['amount'],
                'frequency' => $def['frequency'],
                'day_of_month' => $def['day_of_month'] ?? null,
                'day_of_week' => $def['day_of_week'] ?? null,
                'start_date' => $origin->toDateString(),
                'active' => true,
            ]);
        }

        $archivedCat = $cats->get('Online Subscription');
        if ($archivedCat) {
            $oldSub = RecurringPaymentStream::create([
                'user_id' => $user->id,
                'recurring_payment_category_id' => $archivedCat->id,
                'name' => 'Disney+ (cancelled)',
                'active' => false,
            ]);
            RecurringPaymentEntry::create([
                'user_id' => $user->id,
                'recurring_payment_stream_id' => $oldSub->id,
                'amount' => 8.99,
                'frequency' => 'monthly',
                'day_of_month' => 3,
                'start_date' => $origin->toDateString(),
                'end_date' => $origin->copy()->endOfMonth()->toDateString(),
                'active' => false,
            ]);
            $oldSub->delete();
        }
    }

    private function bumpNetflix(User $user, Carbon $thisMonth, Carbon $lastMonth): void
    {
        $netflix = RecurringPaymentStream::where('user_id', $user->id)->where('name', 'Netflix')->first();
        if (! $netflix) {
            return;
        }

        $old = $netflix->entries()->where('active', true)->first();
        if (! $old) {
            return;
        }

        $old->update([
            'end_date' => $lastMonth->copy()->endOfMonth()->toDateString(),
            'active' => false,
        ]);

        RecurringPaymentEntry::create([
            'user_id' => $user->id,
            'recurring_payment_stream_id' => $netflix->id,
            'amount' => 17.99,
            'frequency' => 'monthly',
            'day_of_month' => 12,
            'start_date' => $thisMonth->toDateString(),
            'active' => true,
        ]);
    }

    private function jitterFreelance(User $user, Carbon $thisMonth): void
    {
        $freelance = RegularIncomeSchedule::where('user_id', $user->id)->where('name', 'Freelance')->first();
        if (! $freelance) {
            return;
        }

        $amounts = [320.00, 480.00, 580.00, 410.00, 540.00, 390.00];
        $entries = IncomeEntry::where('regular_schedule_id', $freelance->id)
            ->whereDate('received_at', '<', $thisMonth->toDateString())
            ->orderBy('received_at')
            ->get();

        foreach ($entries as $i => $entry) {
            $entry->update(['amount' => $amounts[$i % count($amounts)]]);
        }
    }

    /**
     * @param  list<Carbon>  $months
     */
    private function seedIrregularIncome(User $user, Carbon $thisMonth, Carbon $lastMonth, array $months): void
    {
        IncomeEntry::create([
            'user_id' => $user->id,
            'type' => IncomeEntryType::Irregular,
            'name' => 'Birthday gift',
            'description' => 'One-time gift from family',
            'amount' => 100.00,
            'received_at' => $lastMonth->copy()->addDays(10)->toDateString(),
        ]);

        IncomeEntry::create([
            'user_id' => $user->id,
            'type' => IncomeEntryType::Irregular,
            'name' => 'Sold old monitor',
            'description' => 'Marketplace sale',
            'amount' => 75.00,
            'received_at' => $thisMonth->copy()->addDays(4)->toDateString(),
        ]);

        $bonusMonth = $months[count($months) - 7] ?? null;
        if ($bonusMonth) {
            IncomeEntry::create([
                'user_id' => $user->id,
                'type' => IncomeEntryType::Irregular,
                'name' => 'Tax refund',
                'description' => 'Annual filing',
                'amount' => 220.00,
                'received_at' => $bonusMonth->copy()->addDays(8)->toDateString(),
            ]);
        }
    }
}
