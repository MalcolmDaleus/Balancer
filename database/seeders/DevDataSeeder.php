<?php

namespace Database\Seeders;

use App\Enums\IncomeEntryType;
use App\Models\Debt;
use App\Models\DebtCategory;
use App\Models\DebtPayment;
use App\Models\IncomeEntry;
use App\Models\Purchase;
use App\Models\PurchaseCategory;
use App\Models\RecurringPaymentCategory;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Models\Saving;
use App\Models\User;
use App\Services\BalanceSheetService;
use App\Services\FinanceProcessingService;
use App\Services\PurchaseRefundService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

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
            $this->command->error('DevDataSeeder: no user found. Run db:seed first to create the user.');

            return;
        }

        $this->command->info("Seeding dev data for: {$user->email}");

        $now = Carbon::now();
        $thisMonth = $now->copy()->startOfMonth();
        $lastMonth = $now->copy()->subMonth()->startOfMonth();
        $twoAgo = $now->copy()->subMonths(2)->startOfMonth();

        // ------------------------------------------------------------------
        // 1. Regular income schedules
        // ------------------------------------------------------------------
        $this->command->line('  → Regular income schedules');

        $salarySchedule = RegularIncomeSchedule::withTrashed()->firstOrCreate(
            ['user_id' => $user->id, 'name' => 'Main Salary'],
            ['description' => 'Primary full-time employment income', 'active' => true]
        );
        if ($salarySchedule->trashed()) {
            $salarySchedule->restore();
        }

        if ($salarySchedule->versions()->count() === 0) {
            RegularIncomeScheduleVersion::create([
                'user_id'             => $user->id,
                'regular_schedule_id' => $salarySchedule->id,
                'amount'              => 2400.00,
                'frequency'           => 'monthly',
                'day_of_month'        => 1,
                'start_date'          => $twoAgo->toDateString(),
                'active'              => true,
            ]);
        }

        $freelanceSchedule = RegularIncomeSchedule::withTrashed()->firstOrCreate(
            ['user_id' => $user->id, 'name' => 'Freelance'],
            ['description' => 'Side contract work', 'active' => true]
        );
        if ($freelanceSchedule->trashed()) {
            $freelanceSchedule->restore();
        }

        if ($freelanceSchedule->versions()->count() === 0) {
            RegularIncomeScheduleVersion::create([
                'user_id'             => $user->id,
                'regular_schedule_id' => $freelanceSchedule->id,
                'amount'              => 500.00,
                'frequency'           => 'monthly',
                'day_of_month'        => 15,
                'start_date'          => $twoAgo->toDateString(),
                'active'              => true,
            ]);
        }

        // ------------------------------------------------------------------
        // 2. Income entries (regular, irregular, refund)
        // ------------------------------------------------------------------
        $this->command->line('  → Income entries');

        $salaryVersion = $salarySchedule->versions()->where('active', true)->first();
        $freelanceVersion = $freelanceSchedule->versions()->where('active', true)->first();

        $incomeRows = [
            [$salarySchedule, $salaryVersion, $twoAgo, 2400.00],
            [$freelanceSchedule, $freelanceVersion, $twoAgo, 320.00],
            [$salarySchedule, $salaryVersion, $lastMonth, 2400.00],
            [$freelanceSchedule, $freelanceVersion, $lastMonth, 580.00],
            [$salarySchedule, $salaryVersion, $thisMonth, 2400.00],
        ];

        foreach ($incomeRows as [$schedule, $version, $month, $amount]) {
            IncomeEntry::firstOrCreate(
                [
                    'user_id'                     => $user->id,
                    'regular_schedule_version_id' => $version->id,
                    'received_at'                 => $month->toDateString(),
                ],
                [
                    'type'                => IncomeEntryType::Regular,
                    'name'                => $schedule->name,
                    'description'         => $schedule->description,
                    'amount'              => $amount,
                    'regular_schedule_id' => $schedule->id,
                ]
            );
        }

        IncomeEntry::firstOrCreate(
            [
                'user_id'     => $user->id,
                'type'        => IncomeEntryType::Irregular,
                'name'        => 'Birthday gift',
                'received_at' => $lastMonth->copy()->addDays(10)->toDateString(),
            ],
            [
                'amount'      => 100.00,
                'description' => 'One-time gift from family',
            ]
        );

        // ------------------------------------------------------------------
        // 3. Purchases
        // ------------------------------------------------------------------
        $this->command->line('  → Purchases');

        $cats = PurchaseCategory::where('user_id', $user->id)
            ->get()
            ->keyBy('name');

        $groceriesCat = $cats->get('Groceries');
        $diningCat = $cats->get('Dining');
        $entertainmentCat = $cats->get('Entertainment');
        $adultingCat = $cats->get('Adulting');
        $miscCat = $cats->get('Miscellaneous');
        $clothesCat = $cats->get('Clothes & Accesories');

        $mkPurchase = function (PurchaseCategory $cat, string $desc, float $amount, Carbon $date) use ($user) {
            Purchase::firstOrCreate(
                ['user_id' => $user->id, 'description' => $desc, 'date' => $date->toDateTimeString()],
                ['category_id' => $cat->id, 'amount' => $amount]
            );
        };

        if ($groceriesCat) {
            $mkPurchase($groceriesCat, 'Lidl weekly shop', 87.43, $twoAgo->copy()->addDays(3));
            $mkPurchase($groceriesCat, 'Lidl weekly shop', 91.20, $twoAgo->copy()->addDays(10));
            $mkPurchase($groceriesCat, 'Mercadona top-up', 34.60, $twoAgo->copy()->addDays(16));
            $mkPurchase($groceriesCat, 'Lidl weekly shop', 79.90, $lastMonth->copy()->addDays(2));
            $mkPurchase($groceriesCat, 'Mercadona weekly shop', 95.10, $lastMonth->copy()->addDays(9));
            $mkPurchase($groceriesCat, 'Lidl top-up', 22.40, $lastMonth->copy()->addDays(15));
            $mkPurchase($groceriesCat, 'Lidl weekly shop', 88.75, $thisMonth->copy()->addDays(3));
        }

        if ($diningCat) {
            $mkPurchase($diningCat, 'Dinner at La Pepita', 42.00, $twoAgo->copy()->addDays(6));
            $mkPurchase($diningCat, 'Coffee & pastry', 8.50, $twoAgo->copy()->addDays(13));
            $mkPurchase($diningCat, 'Lunch with colleagues', 28.00, $lastMonth->copy()->addDays(4));
            $mkPurchase($diningCat, 'Pizza Friday', 19.80, $lastMonth->copy()->addDays(18));
            $mkPurchase($diningCat, 'Date night dinner', 67.50, $thisMonth->copy()->addDays(5));
        }

        if ($entertainmentCat) {
            $mkPurchase($entertainmentCat, 'Cinema tickets x2', 18.00, $twoAgo->copy()->addDays(8));
            $mkPurchase($entertainmentCat, 'Concert ticket', 55.00, $lastMonth->copy()->addDays(12));
        }

        if ($adultingCat) {
            $mkPurchase($adultingCat, 'Electricity bill', 62.30, $twoAgo->copy()->addDays(5));
            $mkPurchase($adultingCat, 'Electricity bill', 58.90, $lastMonth->copy()->addDays(5));
            $mkPurchase($adultingCat, 'Electricity bill', 54.40, $thisMonth->copy()->addDays(5));
            $mkPurchase($adultingCat, 'Car service / ITV', 155.00, $lastMonth->copy()->addDays(20));
        }

        if ($miscCat) {
            $mkPurchase($miscCat, 'Amazon - USB hub', 24.99, $twoAgo->copy()->addDays(14));
            $mkPurchase($miscCat, 'Pharmacist', 11.60, $lastMonth->copy()->addDays(7));
        }

        if ($clothesCat) {
            $mkPurchase($clothesCat, 'Zara jacket', 89.95, $lastMonth->copy()->addDays(22));
        }

        // ------------------------------------------------------------------
        // 4. Refunded purchase
        // ------------------------------------------------------------------
        $this->command->line('  → Refunded purchase');

        if ($miscCat) {
            $refundPurchase = Purchase::firstOrCreate(
                ['user_id' => $user->id, 'description' => 'Faulty headphones', 'date' => $twoAgo->copy()->addDays(19)->toDateTimeString()],
                ['category_id' => $miscCat->id, 'amount' => 49.99, 'is_refunded' => false]
            );

            // Idempotent: skip if already fully refunded (re-seed safe).
            if (! $refundPurchase->is_refunded) {
                app(PurchaseRefundService::class)->refund(
                    $refundPurchase,
                    (int) $user->id,
                    49.99,
                    $lastMonth->toDateString(),
                );
            }
        }

        // ------------------------------------------------------------------
        // 5. Debts
        // ------------------------------------------------------------------
        $this->command->line('  → Debts');

        $loanCat = DebtCategory::where('user_id', $user->id)->where('name', 'Loan')->first();
        $personalCat = DebtCategory::where('user_id', $user->id)->where('name', 'Personal')->first();

        $laptopDebt = Debt::firstOrCreate(
            ['user_id' => $user->id, 'description' => 'Laptop loan from friend'],
            [
                'category_id' => $personalCat?->id,
                'amount' => 600.00,
                'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
                'notes' => 'Interest-free, paying back gradually',
            ]
        );

        if ($laptopDebt->payments()->count() === 0) {
            DebtPayment::create([
                'user_id' => $user->id,
                'debt_id' => $laptopDebt->id,
                'amount' => 200.00,
                'paid_at' => $lastMonth->copy()->addDays(15)->toDateTimeString(),
                'notes' => 'First instalment',
            ]);
            DebtPayment::create([
                'user_id' => $user->id,
                'debt_id' => $laptopDebt->id,
                'amount' => 200.00,
                'paid_at' => $thisMonth->copy()->addDays(2)->toDateTimeString(),
                'notes' => 'Second instalment',
            ]);
        }

        $bankDebt = Debt::firstOrCreate(
            ['user_id' => $user->id, 'description' => 'Bank micro-loan'],
            [
                'category_id' => $loanCat?->id,
                'amount' => 300.00,
                'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
                'notes' => 'Short-term loan — now paid off',
            ]
        );

        if ($bankDebt->payments()->count() === 0) {
            DebtPayment::create([
                'user_id' => $user->id,
                'debt_id' => $bankDebt->id,
                'amount' => 150.00,
                'paid_at' => $twoAgo->copy()->addDays(20)->toDateTimeString(),
            ]);
            DebtPayment::create([
                'user_id' => $user->id,
                'debt_id' => $bankDebt->id,
                'amount' => 150.00,
                'paid_at' => $lastMonth->copy()->addDays(5)->toDateTimeString(),
                'notes' => 'Final payment',
            ]);
        }

        $forgivenDebt = Debt::firstOrCreate(
            ['user_id' => $user->id, 'description' => 'Old gym debt (forgiven)'],
            [
                'category_id' => $personalCat?->id,
                'amount' => 120.00,
                'issue_date' => $twoAgo->copy()->addDays(1)->toDateTimeString(),
                'notes' => 'Friend said forget it',
            ]
        );

        if (! $forgivenDebt->is_forgiven && $forgivenDebt->payments()->count() === 0) {
            $forgivenDebt->update([
                'is_forgiven' => true,
                'settle_date' => $lastMonth->copy()->addDays(25)->toDateTimeString(),
            ]);
        }

        // ------------------------------------------------------------------
        // 6. Savings
        // ------------------------------------------------------------------
        $this->command->line('  → Savings');

        Saving::firstOrCreate(
            ['user_id' => $user->id, 'month' => $twoAgo->toDateString(), 'type' => 'deposit'],
            ['amount' => 250.00, 'notes' => 'Monthly savings transfer']
        );
        Saving::firstOrCreate(
            ['user_id' => $user->id, 'month' => $lastMonth->toDateString(), 'type' => 'deposit'],
            ['amount' => 300.00, 'notes' => 'Monthly savings transfer']
        );
        Saving::firstOrCreate(
            ['user_id' => $user->id, 'month' => $lastMonth->toDateString(), 'type' => 'withdrawal'],
            ['amount' => 50.00, 'notes' => 'Emergency withdrawal']
        );
        Saving::firstOrCreate(
            ['user_id' => $user->id, 'month' => $thisMonth->toDateString(), 'type' => 'deposit'],
            ['amount' => 150.00, 'notes' => 'Monthly savings transfer']
        );

        // ------------------------------------------------------------------
        // 7. Recurring payment streams + entries
        // ------------------------------------------------------------------
        $this->command->line('  → Recurring payment streams & entries');

        $rpCats = RecurringPaymentCategory::where('user_id', $user->id)->get()->keyBy('name');

        $subCat = $rpCats->get('Online Subscription');
        $rentCat = $rpCats->get('Rent / Mortgage');
        $gymCat = $rpCats->get('Gym / Health');
        $phoneCat = $rpCats->get('Phone / Internet');

        $recurringDefs = [
            ['stream_name' => 'Netflix', 'category' => $subCat, 'amount' => 15.99, 'frequency' => 'monthly', 'day_of_month' => 12],
            ['stream_name' => 'Spotify', 'category' => $subCat, 'amount' => 10.99, 'frequency' => 'monthly', 'day_of_month' => 1],
            ['stream_name' => 'Apartment Rent', 'category' => $rentCat, 'amount' => 750.00, 'frequency' => 'monthly', 'day_of_month' => 1],
            ['stream_name' => 'Gym Membership', 'category' => $gymCat, 'amount' => 35.00, 'frequency' => 'monthly', 'day_of_month' => 5],
            ['stream_name' => 'Phone Plan', 'category' => $phoneCat, 'amount' => 28.00, 'frequency' => 'monthly', 'day_of_month' => 18],
        ];

        foreach ($recurringDefs as $def) {
            $stream = RecurringPaymentStream::withTrashed()->firstOrCreate(
                ['user_id' => $user->id, 'name' => $def['stream_name']],
                ['recurring_payment_category_id' => $def['category']?->id]
            );
            if ($stream->trashed()) {
                $stream->restore();
            }

            if ($stream->entries()->where('active', true)->count() === 0) {
                RecurringPaymentEntry::create([
                    'user_id'                     => $user->id,
                    'recurring_payment_stream_id' => $stream->id,
                    'amount'                      => $def['amount'],
                    'frequency'                   => $def['frequency'],
                    'day_of_month'                => $def['day_of_month'] ?? null,
                    'start_date'                  => $twoAgo->toDateString(),
                    'active'                      => true,
                ]);
            }
        }

        $netflixStream = RecurringPaymentStream::where('user_id', $user->id)->where('name', 'Netflix')->first();
        if ($netflixStream && $netflixStream->entries()->count() === 1) {
            $oldEntry = $netflixStream->entries()->first();
            if ($oldEntry && is_null($oldEntry->end_date)) {
                $oldEntry->update([
                    'end_date' => $lastMonth->copy()->endOfMonth()->toDateString(),
                    'active' => false,
                ]);
                RecurringPaymentEntry::create([
                    'user_id'                     => $user->id,
                    'recurring_payment_stream_id' => $netflixStream->id,
                    'amount'                      => 17.99,
                    'frequency'                   => 'monthly',
                    'day_of_month'                => 12,
                    'start_date'                  => $thisMonth->toDateString(),
                    'active'                      => true,
                ]);
            }
        }

        // Materialize recurring_charges (and due income) before locking past months
        // so snapshots match the production process-due path.
        $this->command->line('  → Syncing finance (materialize charges / due income)');
        app(FinanceProcessingService::class)->syncUser($user->id);

        $this->command->info('✓ Dev data seeded successfully.');
        $this->command->line('');
        $this->command->line('  → Closing past months (snapshots for history module)');
        foreach ([$twoAgo, $lastMonth] as $closeMonth) {
            (new BalanceSheetService($user->id, $closeMonth))->persistSnapshot();
            $this->command->line('     Closed '.$closeMonth->format('F Y'));
        }
        $this->command->line('');
        $this->command->line('  Try: GET /api/v1/balance-sheet?month='.$thisMonth->format('Y-m'));
    }
}
