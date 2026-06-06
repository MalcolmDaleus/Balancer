import { useState } from 'react';
import { DebtsTab } from './debts-tab';
import { IncomeTab } from './income-tab';
import { PurchasesTab } from './purchases-tab';
import { RecurringTab } from './recurring-tab';
import { SavingsTab } from './savings-tab';
import { tabInactiveCls, tintChip } from './shared';

// ---------------------------------------------------------------------------
// Main tab definitions
// ---------------------------------------------------------------------------

const MAIN_TABS = ['Income', 'Purchases', 'Debts', 'Recurring', 'Savings'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const TAB_COLORS: Record<MainTab, string> = {
    Income: 'bg-emerald-500',
    Purchases: 'bg-amber-500',
    Debts: 'bg-red-500',
    Recurring: 'bg-orange-400',
    Savings: 'bg-sky-500',
};

const TAB_ACTIVE: Record<MainTab, string> = {
    Income:    tintChip.emerald,
    Purchases: tintChip.amber,
    Debts:     tintChip.red,
    Recurring: tintChip.orange,
    Savings:   tintChip.sky,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
    className?: string;
}

export default function CreatorSuiteCard({ className = '' }: Props) {
    const [activeTab, setActiveTab] = useState<MainTab>('Purchases');
    const [loaded, setLoaded] = useState<Set<MainTab>>(new Set(['Purchases']));

    const switchTab = (tab: MainTab) => {
        setActiveTab(tab);
        setLoaded((prev) => new Set([...prev, tab]));
    };

    return (
        <div
            className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            {/* Card header */}
            <div className="shrink-0 border-b border-slate-100 px-4 pt-4 pb-3 dark:border-neutral-800">
                <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-neutral-50">Creator Suite</h2>

                {/* Main tab bar */}
                <div className="flex flex-wrap gap-1.5">
                    {MAIN_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => switchTab(tab)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-medium transition-colors ${
                                activeTab === tab
                                    ? TAB_ACTIVE[tab]
                                    : tabInactiveCls
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${activeTab === tab ? TAB_COLORS[tab] : 'bg-slate-300 dark:bg-neutral-500'}`}
                            />
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content — lazy-mount: once loaded, always kept in DOM (hidden) to preserve state */}
            <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3">
                {loaded.has('Income') && (
                    <div className={`h-full ${activeTab !== 'Income' ? 'hidden' : 'flex flex-col'}`}>
                        <IncomeTab active={activeTab === 'Income'} />
                    </div>
                )}
                {loaded.has('Purchases') && (
                    <div className={`h-full ${activeTab !== 'Purchases' ? 'hidden' : 'flex flex-col'}`}>
                        <PurchasesTab active={activeTab === 'Purchases'} />
                    </div>
                )}
                {loaded.has('Debts') && (
                    <div className={`h-full ${activeTab !== 'Debts' ? 'hidden' : 'flex flex-col'}`}>
                        <DebtsTab active={activeTab === 'Debts'} />
                    </div>
                )}
                {loaded.has('Recurring') && (
                    <div className={`h-full ${activeTab !== 'Recurring' ? 'hidden' : 'flex flex-col'}`}>
                        <RecurringTab active={activeTab === 'Recurring'} />
                    </div>
                )}
                {loaded.has('Savings') && (
                    <div className={`h-full ${activeTab !== 'Savings' ? 'hidden' : 'flex flex-col'}`}>
                        <SavingsTab active={activeTab === 'Savings'} />
                    </div>
                )}
            </div>
        </div>
    );
}
