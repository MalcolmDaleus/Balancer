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
use App\Services\BalanceSheetService;
use App\Services\DebtSettlementService;
use App\Services\FinanceProcessingService;
use App\Services\PurchaseRefundService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Local-only demo dataset for the first user.
 *
 * Rebuilds financial rows from a known baseline so Creator Suite / Balance Sheet
 * match current production paths (refund service, settlement, materialization).
 * Does not change the user identity fields.
 */
class DevDataSeeder extends Seeder
{
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

        // Fill profile gaps only — never overwrite existing identity/profile values.
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
        $twoAgo = $now->copy()->subMonthsNoOverflow(2)->startOfMonth();

        $this->seedIncome($user, $thisMonth, $lastMonth, $twoAgo);
        $this->seedPurchases($user, $thisMonth, $lastMonth, $twoAgo);
        $this->seedRefund($user, $lastMonth, $twoAgo);
        $this->seedDebts($user, $thisMonth, $lastMonth, $twoAgo);
        $this->seedSavings($user, $thisMonth, $lastMonth, $twoAgo);
        $this->seedRecurring($user, $thisMonth, $lastMonth, $twoAgo);

        $this->command->line('  → Syncing finance (materialize charges / due income / close backlog)');
        $result = app(FinanceProcessingService::class)->syncUser($user->id);
        foreach ($result['closed_months'] as $ym) {
            $this->command->line("     Closed {$ym}");
        }

        // Ensure the two historical months used by demo purchases/income are locked
        // even if auto-close already covered them (idempotent upsert).
        $this->command->line('  → Ensuring history snapshots');
        foreach ([$twoAgo, $lastMonth] as $closeMonth) {
            (new BalanceSheetService($user->id, $closeMonth))->persistSnapshot();
            $this->command->line('     Snapshot '.$closeMonth->format('F Y'));
        }

        $this->command->info('✓ Dev data rebuilt.');
        $this->command->line('  Open dashboard or GET /api/v1/balance-sheet?month='.$thisMonth->format('Y-m'));
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

            // Categories are recreated by their seeders next.
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

    private function seedIncome(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $twoAgo): void
    {
        $this->command->line('  → Income schedules & entries');

        $salary = RegularIncomeSchedule::create([
            'user_id' => $user->id,
            'name' => 'Main Salary',
            'description' => 'Primary full-time employment income',
            'active' => true,
        ]);

        $salaryVersion = RegularIncomeScheduleVersion::create([
            'user_id' => $user->id,
            'regular_schedule_id' => $salary->id,
            'amount' => 2400.00,
            'frequency' => 'monthly',
            'day_of_month' => 1,
            'start_date' => $twoAgo->toDateString(),
            'active' => true,
        ]);

        $freelance = RegularIncomeSchedule::create([
            'user_id' => $user->id,
            'name' => 'Freelance',
            'description' => 'Side contract work',
            'active' => true,
        ]);

        $freelanceVersion = RegularIncomeScheduleVersion::create([
            'user_id' => $user->id,
            'regular_schedule_id' => $freelance->id,
            'amount' => 500.00,
            'frequency' => 'monthly',
            'day_of_month' => 15,
            'start_date' => $twoAgo->toDateString(),
            'active' => true,
        ]);

        // Historical regular Facts (past months). Current month is filled by finance sync.
        foreach ([
            [$salary, $salaryVersion, $twoAgo, 2400.00],
            [$freelance, $freelanceVersion, $twoAgo->copy()->addDays(14), 320.00],
            [$salary, $salaryVersion, $lastMonth, 2400.00],
            [$freelance, $freelanceVersion, $lastMonth->copy()->addDays(14), 580.00],
        ] as [$schedule, $version, $receivedAt, $amount]) {
            IncomeEntry::create([
                'user_id' => $user->id,
                'type' => IncomeEntryType::Regular,
                'name' => $schedule->name,
                'description' => $schedule->description,
                'amount' => $amount,
                'received_at' => $receivedAt->toDateString(),
                'regular_schedule_id' => $schedule->id,
                'regular_schedule_version_id' => $version->id,
            ]);
        }

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
    }

    private function seedPurchases(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $twoAgo): void
    {
        $this->command->line('  → Purchases');

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
                'amount' => $amount,
                'date' => $date->toDateTimeString(),
            ]);
        };

        $mk('Groceries', 'Lidl weekly shop', 87.43, $twoAgo->copy()->addDays(3));
        $mk('Groceries', 'Lidl weekly shop', 91.20, $twoAgo->copy()->addDays(10));
        $mk('Groceries', 'Mercadona top-up', 34.60, $twoAgo->copy()->addDays(16));
        $mk('Groceries', 'Lidl weekly shop', 79.90, $lastMonth->copy()->addDays(2));
        $mk('Groceries', 'Mercadona weekly shop', 95.10, $lastMonth->copy()->addDays(9));
        $mk('Groceries', 'Lidl top-up', 22.40, $lastMonth->copy()->addDays(15));
        $mk('Groceries', 'Lidl weekly shop', 88.75, $thisMonth->copy()->addDays(3));

        $mk('Dining', 'Dinner at La Pepita', 42.00, $twoAgo->copy()->addDays(6));
        $mk('Dining', 'Coffee & pastry', 8.50, $twoAgo->copy()->addDays(13));
        $mk('Dining', 'Lunch with colleagues', 28.00, $lastMonth->copy()->addDays(4));
        $mk('Dining', 'Pizza Friday', 19.80, $lastMonth->copy()->addDays(18));
        $mk('Dining', 'Date night dinner', 67.50, $thisMonth->copy()->addDays(5));

        $mk('Entertainment', 'Cinema tickets x2', 18.00, $twoAgo->copy()->addDays(8));
        $mk('Entertainment', 'Concert ticket', 55.00, $lastMonth->copy()->addDays(12));

        $mk('Adulting', 'Electricity bill', 62.30, $twoAgo->copy()->addDays(5));
        $mk('Adulting', 'Electricity bill', 58.90, $lastMonth->copy()->addDays(5));
        $mk('Adulting', 'Electricity bill', 54.40, $thisMonth->copy()->addDays(5));
        $mk('Adulting', 'Car service / ITV', 155.00, $lastMonth->copy()->addDays(20));

        $mk('Miscellaneous', 'Amazon - USB hub', 24.99, $twoAgo->copy()->addDays(14));
        $mk('Miscellaneous', 'Pharmacist', 11.60, $lastMonth->copy()->addDays(7));

        $mk('Clothes & Accessories', 'Zara jacket', 89.95, $lastMonth->copy()->addDays(22));
    }

    private function seedRefund(User $user, Carbon $lastMonth, Carbon $twoAgo): void
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
            'date' => $twoAgo->copy()->addDays(19)->toDateTimeString(),
            'is_refunded' => false,
        ]);

        app(PurchaseRefundService::class)->refund(
            $purchase,
            (int) $user->id,
            49.99,
            $lastMonth->copy()->addDays(3)->toDateString(),
        );
    }

    private function seedDebts(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $twoAgo): void
    {
        $this->command->line('  → Debts');

        $settlement = app(DebtSettlementService::class);
        $loanCat = DebtCategory::where('user_id', $user->id)->where('name', 'Loan')->first();
        $personalCat = DebtCategory::where('user_id', $user->id)->where('name', 'Personal')->first();

        $laptop = Debt::create([
            'user_id' => $user->id,
            'category_id' => $personalCat?->id,
            'description' => 'Laptop loan from friend',
            'amount' => 600.00,
            'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
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

        $bank = Debt::create([
            'user_id' => $user->id,
            'category_id' => $loanCat?->id,
            'description' => 'Bank micro-loan',
            'amount' => 300.00,
            'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
            'notes' => 'Short-term loan — now paid off',
        ]);

        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $bank->id,
            'amount' => 150.00,
            'paid_at' => $twoAgo->copy()->addDays(20)->toDateTimeString(),
        ]);
        DebtPayment::create([
            'user_id' => $user->id,
            'debt_id' => $bank->id,
            'amount' => 150.00,
            'paid_at' => $lastMonth->copy()->addDays(5)->toDateTimeString(),
            'notes' => 'Final payment',
        ]);
        $settlement->sync($bank);

        Debt::create([
            'user_id' => $user->id,
            'category_id' => $personalCat?->id,
            'description' => 'Old gym debt (forgiven)',
            'amount' => 120.00,
            'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
            'notes' => 'Friend said forget it',
            'is_forgiven' => true,
            'settle_date' => $lastMonth->copy()->addDays(25)->toDateTimeString(),
        ]);
    }

    private function seedSavings(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $twoAgo): void
    {
        $this->command->line('  → Savings');

        Saving::create([
            'user_id' => $user->id,
            'month' => $twoAgo->toDateString(),
            'type' => 'deposit',
            'amount' => 250.00,
            'notes' => 'Monthly savings transfer',
        ]);
        Saving::create([
            'user_id' => $user->id,
            'month' => $lastMonth->toDateString(),
            'type' => 'deposit',
            'amount' => 300.00,
            'notes' => 'Monthly savings transfer',
        ]);
        Saving::create([
            'user_id' => $user->id,
            'month' => $lastMonth->toDateString(),
            'type' => 'withdrawal',
            'amount' => 50.00,
            'notes' => 'Emergency withdrawal',
        ]);
        Saving::create([
            'user_id' => $user->id,
            'month' => $thisMonth->toDateString(),
            'type' => 'deposit',
            'amount' => 150.00,
            'notes' => 'Monthly savings transfer',
        ]);
    }

    private function seedRecurring(User $user, Carbon $thisMonth, Carbon $lastMonth, Carbon $twoAgo): void
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
                'start_date' => $twoAgo->toDateString(),
                'active' => true,
            ]);
        }

        // Price history demo: Netflix raised this month.
        $netflix = RecurringPaymentStream::where('user_id', $user->id)->where('name', 'Netflix')->first();
        if ($netflix) {
            $old = $netflix->entries()->where('active', true)->first();
            if ($old) {
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
        }

        // Soft-archived stream with no Facts (safe to hard-delete in UI).
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
                'start_date' => $twoAgo->toDateString(),
                'end_date' => $twoAgo->copy()->endOfMonth()->toDateString(),
                'active' => false,
            ]);
            $oldSub->delete();
        }
    }
}
