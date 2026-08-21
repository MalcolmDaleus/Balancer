import { apiFetch, errorMessage } from '@/api/client';
import BalanceSheetHistoryCard from '@/components/balance-sheet-history-card';
import DashboardHeader from '@/components/dashboard-header';
import CreatorSuiteCard from '@/components/creator-suite';
import { tintChip, tintSectionPill } from '@/components/creator-suite/shared';
import SettingsDrawer from '@/components/settings/settings-drawer';
import SettingsPanel from '@/components/settings/settings-panel';
import { FinanceDataProvider, useFinanceData } from '@/contexts/finance-data';
import { SettingsProvider, useSettings } from '@/contexts/settings';
import { useFormatMoney } from '@/hooks/use-format-money';
import { type BalanceSheetExpanded } from '@/types/api';
import { Head } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const VISIBLE_REGULAR_ENTRIES = 3;

function IncomeBalanceContent({
    income,
    signed,
}: {
    income: BalanceSheetExpanded['income'];
    signed: (value: number, sign: '+' | '-') => string;
}) {
    const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

    const toggleSchedule = (key: string) => {
        setExpandedSchedules((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="space-y-3">
            {income.by_type.regular.schedules.map((schedule) => {
                const key = String(schedule.regular_schedule_id ?? schedule.name);
                const expanded = expandedSchedules.has(key);
                const visible = expanded ? schedule.entries : schedule.entries.slice(0, VISIBLE_REGULAR_ENTRIES);
                const hiddenCount = schedule.entries.length - VISIBLE_REGULAR_ENTRIES;

                return (
                    <div key={key} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-neutral-950/50">
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium text-slate-800 dark:text-neutral-100">{schedule.name}</span>
                            <span className="text-base font-medium text-slate-700 dark:text-neutral-200">
                                {signed(schedule.total, '+')}
                            </span>
                        </div>
                        {schedule.entries.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                                {visible.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between text-sm text-slate-500 dark:text-neutral-200"
                                    >
                                        <span>{entry.received_at}</span>
                                        <span className="font-medium text-slate-700 dark:text-neutral-200">
                                            {signed(entry.amount, '+')}
                                        </span>
                                    </div>
                                ))}
                                {!expanded && hiddenCount > 0 && (
                                    <button
                                        type="button"
                                        aria-expanded={false}
                                        onClick={() => toggleSchedule(key)}
                                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                    >
                                        Show {hiddenCount} more
                                    </button>
                                )}
                                {expanded && schedule.entries.length > VISIBLE_REGULAR_ENTRIES && (
                                    <button
                                        type="button"
                                        aria-expanded={true}
                                        onClick={() => toggleSchedule(key)}
                                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-neutral-400"
                                    >
                                        Show less
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            {income.by_type.irregular.total > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-slate-100/80 px-2.5 py-2 dark:bg-neutral-950/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-neutral-200">Irregular</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-neutral-100">
                        {signed(income.by_type.irregular.total, '+')}
                    </span>
                </div>
            )}
            {income.by_type.refund.total > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-slate-100/80 px-2.5 py-2 dark:bg-neutral-950/50">
                    <span className="text-sm font-medium text-slate-700 dark:text-neutral-200">Refunds</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-neutral-100">
                        {signed(income.by_type.refund.total, '+')}
                    </span>
                </div>
            )}
        </div>
    );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtRecurringEntryLabel(
    entry: BalanceSheetExpanded['recurring_payments']['streams'][number]['entries'][number],
) {
    if (entry.frequency === 'yearly') {
        const base = entry.day_of_month ? `Annual · day ${entry.day_of_month}` : 'Annual';
        return entry.occurrence_count > 1 ? `${base} × ${entry.occurrence_count}` : base;
    }
    if (entry.frequency === 'weekly' && entry.day_of_week != null) {
        const base = `Weekly · ${DAY_NAMES[entry.day_of_week]}`;
        return entry.occurrence_count > 1 ? `${base} × ${entry.occurrence_count}` : base;
    }
    if (entry.frequency === 'monthly') {
        const base = entry.day_of_month ? `Monthly · day ${entry.day_of_month}` : 'Monthly';
        return entry.occurrence_count > 1 ? `${base} × ${entry.occurrence_count}` : base;
    }
    return entry.occurrence_count > 1 ? `${entry.frequency} × ${entry.occurrence_count}` : entry.frequency;
}

function RecurringStreamList({
    streams,
    signed,
    emptyLabel,
}: {
    streams: BalanceSheetExpanded['recurring_payments']['streams'];
    signed: (value: number, sign: '+' | '-') => string;
    emptyLabel: string;
}) {
    if (!streams.length) {
        return <p className="text-sm text-slate-500 dark:text-neutral-200">{emptyLabel}</p>;
    }

    return (
        <div className="space-y-2">
            {streams.map((stream) => (
                <div key={stream.stream_id} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-neutral-950/50">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-base font-medium text-slate-800 dark:text-neutral-100">{stream.stream_name}</span>
                            {stream.category_name && stream.category_name !== 'Uncategorized' && (
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">{stream.category_name}</p>
                            )}
                        </div>
                        <span className="shrink-0 text-base font-medium text-slate-700 dark:text-neutral-200">
                            {signed(stream.total, '-')}
                        </span>
                    </div>
                    <div className="mt-1.5 space-y-1">
                        {stream.entries.map((entry, idx) => (
                            <div
                                key={`${entry.id}-${entry.charged_date ?? idx}`}
                                className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-neutral-200"
                            >
                                <span>
                                    {entry.charged_date
                                        ? entry.charged_date
                                        : fmtRecurringEntryLabel(entry)}
                                </span>
                                <div className="shrink-0 text-right">
                                    {entry.occurrence_count > 1 && (
                                        <span className="mr-2 text-xs text-slate-400 dark:text-neutral-500">
                                            {signed(entry.amount, '-')} each
                                        </span>
                                    )}
                                    <span className="font-medium text-slate-700 dark:text-neutral-200">
                                        {signed(entry.period_total, '-')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function RecurringBalanceContent({
    recurring,
    signed,
}: {
    recurring: BalanceSheetExpanded['recurring_payments'];
    signed: (value: number, sign: '+' | '-') => string;
}) {
    const chargedTotal = recurring.charged_total ?? recurring.total;
    const projectedTotal = recurring.projected_total ?? 0;
    const projected = recurring.projected ?? [];

    return (
        <div className="space-y-4">
            <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                    <span>Charged</span>
                    <span>{signed(chargedTotal, '-')}</span>
                </div>
                <RecurringStreamList
                    streams={recurring.streams}
                    signed={signed}
                    emptyLabel="No charges yet this month"
                />
            </div>
            {(projectedTotal > 0 || projected.length > 0) && (
                <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                        <span>Projected remaining</span>
                        <span>{signed(projectedTotal, '-')}</span>
                    </div>
                    <RecurringStreamList
                        streams={projected}
                        signed={signed}
                        emptyLabel="No remaining scheduled charges"
                    />
                </div>
            )}
        </div>
    );
}

// ─── Shared card shell ────────────────────────────────────────────────────────
function ModuleCard({
    title,
    subtitle,
    children,
    className = '',
}: {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex flex-col rounded-2xl bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">{subtitle}</p>}
            </div>
            <div className="flex flex-1 items-center justify-center text-sm text-slate-300 dark:text-neutral-500">
                {children ?? 'Coming soon'}
            </div>
        </div>
    );
}

// ─── Mobile module list ───────────────────────────────────────────────────────
const MODULES = [
    { id: 'balance-sheet', title: 'Balance Sheet', subtitle: 'Monthly financial overview' },
    { id: 'creator-suite', title: 'Creator Suite', subtitle: 'Add and manage entries' },
    { id: 'statistics', title: 'Statistics', subtitle: 'Trends and insights' },
    { id: 'sheet-history', title: 'Past Balance Sheets', subtitle: 'Closed monthly snapshots' },
    { id: 'settings', title: 'Settings', subtitle: 'Account preferences' },
];

function BalanceSheetCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const { financeEpoch } = useFinanceData();
    const [data, setData] = useState<BalanceSheetExpanded | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null); // all collapsed by default

    const loadBalanceSheet = useCallback(async (silent = false) => {
        if (silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const payload = await apiFetch<BalanceSheetExpanded>('/api/v1/balance-sheet');
            setData(payload);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadBalanceSheet();
    }, [loadBalanceSheet]);

    useEffect(() => {
        if (financeEpoch > 0) {
            void loadBalanceSheet(true);
        }
    }, [financeEpoch, loadBalanceSheet]);

    const signed = (value: number, sign: '+' | '-') => `${sign}${amount(Math.abs(value))}`;

    const pillBase = 'rounded-full px-2.5 py-0.5 text-sm font-medium';
    const sectionAmount = (
        primary: ReactNode,
        secondary: ReactNode,
        primaryClassName = 'text-base font-semibold text-slate-800 dark:text-neutral-100',
    ) => (
        <div className="text-right leading-tight">
            <div className={primaryClassName}>{primary}</div>
            <div className="text-sm text-slate-600 dark:text-neutral-200">{secondary}</div>
        </div>
    );
    const statusClass = (debt: BalanceSheetExpanded['debt']['debts'][number]) => {
        if (debt.is_forgiven) return tintChip.amber;
        if (debt.is_settled) return tintChip.emerald;
        return tintChip.slate;
    };

    const purchaseItemCount = data
        ? data.spending.categories.reduce((n, c) => n + c.items.length, 0)
        : 0;

    const regularScheduleCount = data ? data.income.by_type.regular.schedules.length : 0;
    const hasIncome =
        data &&
        (data.income.total > 0 ||
            regularScheduleCount > 0 ||
            data.income.by_type.irregular.total > 0 ||
            data.income.by_type.refund.total > 0);

    const sections = data
        ? [
              {
                  key: 'income',
                  label: 'Income',
                  pillClass: tintSectionPill.emerald,
                  amountNode: sectionAmount(
                      signed(data.income.total, '+'),
                      hasIncome
                          ? `${regularScheduleCount} schedule${regularScheduleCount === 1 ? '' : 's'}`
                          : 'No entries',
                  ),
                  content: hasIncome ? (
                      <IncomeBalanceContent income={data.income} signed={signed} />
                  ) : (
                      <p className="text-sm text-slate-500 dark:text-neutral-200">No entries this month</p>
                  ),
              },
              {
                  key: 'debt',
                  label: 'Debt',
                  pillClass: tintSectionPill.red,
                  amountNode: sectionAmount(
                      <>Paid {signed(data.debt.total, '-')}</>,
                      <>Balance {amount(data.debt.balance_total)}</>,
                      'text-base font-semibold text-red-600 dark:text-red-300',
                  ),
                  content: data.debt.debts.length ? (
                      <div className="space-y-2">
                          {data.debt.debts.map((debt) => (
                              <div key={debt.id} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-neutral-950/50">
                                  <div className="mb-1.5 flex items-center justify-between gap-2">
                                      <span className="truncate text-base font-medium text-slate-800 dark:text-neutral-100">{debt.description}</span>
                                      {(debt.is_forgiven || debt.is_settled) && (
                                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(debt)}`}>
                                              {debt.is_forgiven ? 'Forgiven' : 'Settled'}
                                          </span>
                                      )}
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                      <span className="font-medium text-red-600 dark:text-red-300">Paid {signed(debt.total_paid_in_period, '-')}</span>
                                      <span className="text-slate-600 dark:text-neutral-200">Remaining {amount(debt.remaining_balance)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-slate-500 dark:text-neutral-200">No entries this month</p>
                  ),
              },
              {
                  key: 'spending',
                  label: 'Purchases',
                  pillClass: tintSectionPill.yellow,
                  amountNode: sectionAmount(
                      signed(data.spending.total, '-'),
                      purchaseItemCount
                          ? `${purchaseItemCount} item${purchaseItemCount === 1 ? '' : 's'}`
                          : 'No entries',
                  ),
                  content: data.spending.categories.length ? (
                      <div className="space-y-2">
                          {data.spending.categories.map((category) => (
                              <div key={category.category_name} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-neutral-950/50">
                                  <div className="flex items-center justify-between">
                                      <span className="text-base font-medium text-slate-800 dark:text-neutral-100">{category.category_name}</span>
                                      <span className="text-base font-medium text-slate-700 dark:text-neutral-200">{signed(category.amount, '-')}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-slate-500 dark:text-neutral-200">No entries this month</p>
                  ),
              },
              {
                  key: 'recurring',
                  label: 'Recurring',
                  pillClass: tintSectionPill.orange,
                  amountNode: sectionAmount(
                      signed(data.recurring_payments.total, '-'),
                      (data.recurring_payments.streams.length || (data.recurring_payments.projected?.length ?? 0))
                          ? `${data.recurring_payments.streams.length} charged` +
                            ((data.recurring_payments.projected_total ?? 0) > 0
                                ? ` · ${signed(data.recurring_payments.projected_total ?? 0, '-')} projected`
                                : '')
                          : 'No entries',
                  ),
                  content: (
                      data.recurring_payments.streams.length ||
                      (data.recurring_payments.projected?.length ?? 0) > 0
                  ) ? (
                      <RecurringBalanceContent recurring={data.recurring_payments} signed={signed} />
                  ) : (
                      <p className="text-sm text-slate-500 dark:text-neutral-200">No charges this month</p>
                  ),
              },
              {
                  key: 'savings',
                  label: 'Savings',
                  pillClass: tintSectionPill.sky,
                  amountNode: sectionAmount(
                      amount(data.savings.grand_total),
                      <>This month {amount(data.savings.monthly_total)}</>,
                  ),
                  content: (
                      <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-slate-100/80 px-2.5 py-2 text-sm dark:bg-neutral-950/50">
                              <span className="text-slate-700 dark:text-neutral-200">This month</span>
                              <div className="flex items-center gap-2">
                                  {data.savings.monthly_deposits > 0 && (
                                      <span className="text-emerald-600 dark:text-emerald-400">+{amount(data.savings.monthly_deposits)}</span>
                                  )}
                                  {data.savings.monthly_withdrawals > 0 && (
                                      <span className="text-rose-500 dark:text-rose-400">-{amount(data.savings.monthly_withdrawals)}</span>
                                  )}
                                  <span className="font-medium text-slate-800 dark:text-neutral-100">{amount(data.savings.monthly_total)}</span>
                              </div>
                          </div>
                          {data.savings.rows.length ? (
                              data.savings.rows.map((row) => (
                                  <div key={row.id} className="flex items-center justify-between text-sm text-slate-600 dark:text-neutral-200">
                                      <div className="flex min-w-0 items-center gap-2">
                                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${row.type === 'deposit' ? tintChip.emerald : tintChip.rose}`}>
                                              {row.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                          </span>
                                          {row.notes && <span className="truncate">{row.notes}</span>}
                                      </div>
                                      <span className={`shrink-0 font-medium ${row.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                          {row.type === 'deposit' ? '+' : '-'}{amount(row.amount)}
                                      </span>
                                  </div>
                              ))
                          ) : (
                              <p className="text-sm text-slate-500 dark:text-neutral-200">No entries this month</p>
                          )}
                      </div>
                  ),
              },
          ]
        : [];

    return (
        <div className={`flex flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}>
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">Balance Sheet</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-200">{data?.month ?? 'Loading month...'}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadBalanceSheet(true)}
                    disabled={isLoading || isRefreshing}
                    aria-label="Refresh balance sheet"
                    className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                    <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {isLoading && <p className="text-sm text-slate-500 dark:text-neutral-300">Loading balance sheet...</p>}

                {!isLoading && error && !data && (
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                )}

                {!isLoading && data && (
                    <>
                        {error && (
                            <p className="mb-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>
                        )}
                        <div className="space-y-2">
                        {sections.map((section) => {
                            const isOpen = openSection === section.key;
                            return (
                                <div key={section.key} className="rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:bg-neutral-800/50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.30)]">
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenSection(isOpen ? null : section.key)}
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                                    >
                                        <div className={`inline-flex ${pillBase} ${section.pillClass}`}>{section.label}</div>
                                        {section.amountNode}
                                    </button>

                                    {isOpen && <div className="border-t border-slate-100 px-3 py-2.5 dark:border-neutral-700/60">{section.content}</div>}
                                </div>
                            );
                        })}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-200">Roll over</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{amount(data?.roll_over.total ?? 0)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function SettingsModuleCard({
    title,
    subtitle,
    className = '',
}: {
    title: string;
    subtitle: string;
    className?: string;
}) {
    return (
        <div
            className={`flex min-h-0 flex-col rounded-2xl bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4 shrink-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">{subtitle}</p>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <SettingsPanel idPrefix="mobile-settings" />
            </div>
        </div>
    );
}

export default function Dashboard() {
    return (
        <FinanceDataProvider>
            <SettingsProvider>
                <DashboardShell />
            </SettingsProvider>
        </FinanceDataProvider>
    );
}

function DashboardShell() {
    const renderModule = (id: string, title: string, subtitle: string, className = '') => {
        if (id === 'balance-sheet') return <BalanceSheetCard className={className} />;
        if (id === 'creator-suite') return <CreatorSuiteCard className={className} />;
        if (id === 'sheet-history') return <BalanceSheetHistoryCard className={className} />;
        if (id === 'settings') {
            return <SettingsModuleCard title={title} subtitle={subtitle} className={className} />;
        }
        return <ModuleCard title={title} subtitle={subtitle} className={className} />;
    };

    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const { focusSettingsCard, clearFocusSettingsCard } = useSettings();

    const handleScroll = () => {
        const el = carouselRef.current;
        if (!el) return;
        setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
    };

    const scrollToSlide = (i: number) => {
        const el = carouselRef.current;
        if (!el) return;
        el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!focusSettingsCard) {
            return;
        }

        const index = MODULES.findIndex((mod) => mod.id === 'settings');
        if (index >= 0) {
            // Wait a frame so the carousel has layout width.
            requestAnimationFrame(() => scrollToSlide(index));
        }
        clearFocusSettingsCard();
    }, [focusSettingsCard, clearFocusSettingsCard]);

    return (
        <>
            <Head title="Dashboard" />
            <DashboardHeader />
            <SettingsDrawer />

            <div className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] min-h-screen bg-slate-200 bg-cover bg-center bg-no-repeat pt-20 dark:bg-neutral-950">

                {/* ── Mobile: horizontal scroll-snap carousel ──────────────── */}
                <div className="flex h-[calc(100vh-5rem)] flex-col md:hidden">
                    <div
                        ref={carouselRef}
                        onScroll={handleScroll}
                        className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-scroll px-4 [scroll-padding:0_1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {MODULES.map((mod) => (
                            <div key={mod.id} className="flex w-[calc(100vw-2rem)] shrink-0 snap-start flex-col">
                                {renderModule(mod.id, mod.title, mod.subtitle, 'h-full min-h-0')}
                            </div>
                        ))}
                    </div>

                    {/* Dots */}
                    <div className="flex shrink-0 items-center justify-center gap-2 py-4">
                        {MODULES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => scrollToSlide(i)}
                                aria-label={`Go to slide ${i + 1}`}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    i === activeIndex
                                        ? 'w-6 bg-slate-700 dark:bg-neutral-200'
                                        : 'w-2 bg-slate-400/50 dark:bg-neutral-700'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Desktop: 12-column bento grid ────────────────────────── */}
                <div className="hidden p-6 md:block lg:p-8">
                    <div className="mx-auto grid max-w-screen-xl grid-cols-12 gap-6">

                        {/* Row 1 — Statistics (8) + Balance Sheet (4) */}
                        <ModuleCard
                            title="Statistics"
                            subtitle="Trends and insights"
                            className="col-span-8 min-h-80"
                        />
                        <BalanceSheetCard className="col-span-4 h-[32rem]" />

                        {/* Row 2 — Past Balance Sheets (4) + Creator Suite (8) */}
                        <BalanceSheetHistoryCard className="col-span-4 min-h-80" />
                        <CreatorSuiteCard className="col-span-8 h-[42rem]" />

                    </div>
                </div>

            </div>
        </>
    );
}
