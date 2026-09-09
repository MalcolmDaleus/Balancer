import { useState } from 'react';
import { DebtsTab } from './debts-tab';
import { FeedTab } from './feed-tab';
import { IncomeTab } from './income-tab';
import type { LedgerFocus, LedgerMainTab } from './ledger-focus';
import { tabForDomain } from './ledger-focus';
import { LockedMonthsProvider } from './locked-months';
import { PurchasesTab } from './purchases-tab';
import { RecurringTab } from './recurring-tab';
import { SavingsTab } from './savings-tab';
import { tabInactiveCls, tintChip, tintSectionPill } from './shared';

const MAIN_TABS = ['Feed', 'Income', 'Purchases', 'Debts', 'Recurring', 'Savings'] as const;

const TAB_COLORS: Record<LedgerMainTab, string> = {
    Feed: 'bg-slate-600 dark:bg-neutral-300',
    Income: 'bg-emerald-500',
    Purchases: 'bg-yellow-500',
    Debts: 'bg-red-500',
    Recurring: 'bg-orange-400',
    Savings: 'bg-sky-500',
};

const TAB_ACTIVE: Record<LedgerMainTab, string> = {
    Feed: tintChip.feed,
    Income: tintChip.emerald,
    Purchases: tintSectionPill.yellow,
    Debts: tintChip.red,
    Recurring: tintChip.orange,
    Savings: tintChip.sky,
};

interface Props {
    className?: string;
}

export default function CreatorSuiteCard({ className = '' }: Props) {
    const [activeTab, setActiveTab] = useState<LedgerMainTab>('Feed');
    const [loaded, setLoaded] = useState<Set<LedgerMainTab>>(new Set(['Feed']));
    const [focus, setFocus] = useState<LedgerFocus | null>(null);

    const switchTab = (tab: LedgerMainTab) => {
        setActiveTab(tab);
        setLoaded((prev) => new Set([...prev, tab]));
    };

    const openFact = (next: LedgerFocus) => {
        const tab = tabForDomain(next.domain);
        setFocus(next);
        switchTab(tab);
    };

    return (
        <LockedMonthsProvider>
            <div
                className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
            >
            <div
                data-cs-header
                className="shrink-0 border-b border-slate-100 px-5 pt-5 pb-4 dark:border-neutral-800"
            >
                <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-neutral-50">Ledger</h2>

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

            <div className="flex min-h-0 flex-1 flex-col px-5 pt-3 pb-4" data-cs-body>
                {loaded.has('Feed') && (
                    <div className={`h-full ${activeTab !== 'Feed' ? 'hidden' : 'flex flex-col'}`}>
                        <FeedTab active={activeTab === 'Feed'} onOpenFact={openFact} />
                    </div>
                )}
                {loaded.has('Income') && (
                    <div className={`h-full ${activeTab !== 'Income' ? 'hidden' : 'flex flex-col'}`}>
                        <IncomeTab active={activeTab === 'Income'} focus={focus} onFocusConsumed={() => setFocus(null)} />
                    </div>
                )}
                {loaded.has('Purchases') && (
                    <div className={`h-full ${activeTab !== 'Purchases' ? 'hidden' : 'flex flex-col'}`}>
                        <PurchasesTab active={activeTab === 'Purchases'} focus={focus} onFocusConsumed={() => setFocus(null)} />
                    </div>
                )}
                {loaded.has('Debts') && (
                    <div className={`h-full ${activeTab !== 'Debts' ? 'hidden' : 'flex flex-col'}`}>
                        <DebtsTab active={activeTab === 'Debts'} focus={focus} onFocusConsumed={() => setFocus(null)} />
                    </div>
                )}
                {loaded.has('Recurring') && (
                    <div className={`h-full ${activeTab !== 'Recurring' ? 'hidden' : 'flex flex-col'}`}>
                        <RecurringTab active={activeTab === 'Recurring'} focus={focus} onFocusConsumed={() => setFocus(null)} />
                    </div>
                )}
                {loaded.has('Savings') && (
                    <div className={`h-full ${activeTab !== 'Savings' ? 'hidden' : 'flex flex-col'}`}>
                        <SavingsTab active={activeTab === 'Savings'} focus={focus} onFocusConsumed={() => setFocus(null)} />
                    </div>
                )}
            </div>
            </div>
        </LockedMonthsProvider>
    );
}
