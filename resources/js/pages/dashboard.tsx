import DashboardHeader from '@/components/dashboard-header';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
            className={`flex flex-col rounded-2xl bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-slate-800 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
            </div>
            <div className="flex flex-1 items-center justify-center text-sm text-slate-300 dark:text-slate-600">
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
    { id: 'purchase-history', title: 'Purchase History', subtitle: 'All your purchases' },
    { id: 'settings', title: 'Settings', subtitle: 'Account preferences' },
];

type BalanceSheetExpanded = {
    month: string;
    income: {
        total: number;
        income_entries: Array<{
            income_stream_id: number;
            name: string;
            total: number;
            entries: Array<{ id: number; amount: number; month: string }>;
        }>;
    };
    debt: {
        total: number;
        balance_total: number;
        debts: Array<{
            id: number;
            description: string;
            total_paid_in_period: number;
            remaining_balance: number;
            is_settled: boolean;
            is_forgiven: boolean;
        }>;
    };
    spending: {
        total: number;
        categories: Array<{
            category_name: string;
            amount: number;
            items: Array<{ id: number; description: string; amount: number; date: string }>;
        }>;
    };
    recurring_payments: {
        total: number;
        streams: Array<{
            stream_name: string;
            entries: Array<{ id: number; amount: number; frequency: string }>;
        }>;
    };
    savings: {
        monthly_total: number;
        monthly_deposits: number;
        monthly_withdrawals: number;
        grand_total: number;
        rows: Array<{ id: number; amount: number; type: 'deposit' | 'withdrawal'; notes: string | null; month: string }>;
    };
    roll_over: {
        total: number;
    };
};

function BalanceSheetCard({ className = '' }: { className?: string }) {
    const { auth } = usePage<SharedData>().props;
    const userCurrency = String((auth?.user as { currency?: string } | undefined)?.currency ?? 'USD');
    const [data, setData] = useState<BalanceSheetExpanded | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null); // all collapsed by default

    useEffect(() => {
        let isMounted = true;

        const loadBalanceSheet = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/v1/balance-sheet', {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    throw new Error(`Failed to load balance sheet (${response.status})`);
                }

                const payload = (await response.json()) as BalanceSheetExpanded;
                if (isMounted) setData(payload);
            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err.message : 'Unable to load data.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadBalanceSheet();
        return () => {
            isMounted = false;
        };
    }, []);

    const formatter = useMemo(() => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: userCurrency,
                minimumFractionDigits: 2,
            });
        } catch {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
            });
        }
    }, [userCurrency]);

    const amount = (value: number) => formatter.format(value);
    const signed = (value: number, sign: '+' | '-') => `${sign}${amount(Math.abs(value))}`;

    const pillBase = 'rounded-full px-3.5 py-1.5 text-xs font-medium';
    const statusClass = (debt: BalanceSheetExpanded['debt']['debts'][number]) => {
        if (debt.is_forgiven) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
        if (debt.is_settled) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    };

    const sections = data
        ? [
              {
                  key: 'income',
                  label: 'Income',
                  pillClass: 'bg-emerald-300/25 text-emerald-600/80 dark:bg-emerald-400/15 dark:text-emerald-400/80',
                  amountNode: <span className="text-base font-semibold text-slate-800 dark:text-slate-100">{signed(data.income.total, '+')}</span>,
                  content: data.income.income_entries.length ? (
                      <div className="space-y-2">
                          {data.income.income_entries.map((stream) => (
                              <div key={stream.income_stream_id} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-slate-900/40">
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{stream.name}</span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300">{signed(stream.total, '+')}</span>
                                  </div>
                                  <div className="mt-1 space-y-1">
                                      {stream.entries.map((entry) => (
                                          <div key={entry.id} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                              <span>{entry.month}</span>
                                              <span>{signed(entry.amount, '+')}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No entries this month</p>
                  ),
              },
              {
                  key: 'debt',
                  label: 'Debt',
                  pillClass: 'bg-rose-300/25 text-rose-600/80 dark:bg-rose-400/15 dark:text-rose-400/80',
                  amountNode: (
                      <div className="text-right leading-tight">
                          <div className="text-base font-semibold text-rose-600 dark:text-rose-300">Paid {signed(data.debt.total, '-')}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Balance {amount(data.debt.balance_total)}</div>
                      </div>
                  ),
                  content: data.debt.debts.length ? (
                      <div className="space-y-2">
                          {data.debt.debts.map((debt) => (
                              <div key={debt.id} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-slate-900/40">
                                  <div className="mb-1.5 flex items-center justify-between gap-2">
                                      <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{debt.description}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(debt)}`}>
                                          {debt.is_forgiven ? 'Forgiven' : debt.is_settled ? 'Settled' : 'Open'}
                                      </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-rose-600 dark:text-rose-300">Paid {signed(debt.total_paid_in_period, '-')}</span>
                                      <span className="text-slate-500 dark:text-slate-400">Remaining {amount(debt.remaining_balance)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No entries this month</p>
                  ),
              },
              {
                  key: 'spending',
                  label: 'Purchases',
                  pillClass: 'bg-yellow-300/30 text-yellow-600/80 dark:bg-yellow-400/15 dark:text-yellow-400/80',
                  amountNode: <span className="text-base font-semibold text-slate-800 dark:text-slate-100">{signed(data.spending.total, '-')}</span>,
                  content: data.spending.categories.length ? (
                      <div className="space-y-2">
                          {data.spending.categories.map((category) => (
                              <div key={category.category_name} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-slate-900/40">
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{category.category_name}</span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300">{signed(category.amount, '-')}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No entries this month</p>
                  ),
              },
              {
                  key: 'recurring',
                  label: 'Recurring',
                  pillClass: 'bg-orange-300/25 text-orange-600/80 dark:bg-orange-400/15 dark:text-orange-400/80',
                  amountNode: <span className="text-base font-semibold text-slate-800 dark:text-slate-100">{signed(data.recurring_payments.total, '-')}</span>,
                  content: data.recurring_payments.streams.length ? (
                      <div className="space-y-2">
                          {data.recurring_payments.streams.map((stream) => (
                              <div key={stream.stream_name} className="rounded-lg bg-slate-100/80 p-2.5 dark:bg-slate-900/40">
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{stream.stream_name}</span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300">
                                          {signed(stream.entries.reduce((sum, e) => sum + e.amount, 0), '-')}
                                      </span>
                                  </div>
                                  <div className="mt-1 space-y-1">
                                      {stream.entries.map((entry) => (
                                          <div key={entry.id} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                              <span className="capitalize">{entry.frequency}</span>
                                              <span>{signed(entry.amount, '-')}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No entries this month</p>
                  ),
              },
              {
                  key: 'savings',
                  label: 'Savings',
                  pillClass: 'bg-sky-300/25 text-sky-600/80 dark:bg-sky-400/15 dark:text-sky-400/80',
                  amountNode: <span className="text-base font-semibold text-slate-800 dark:text-slate-100">{amount(data.savings.grand_total)}</span>,
                  content: (
                      <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-slate-100/80 px-2.5 py-2 text-xs dark:bg-slate-900/40">
                              <span className="text-slate-600 dark:text-slate-300">This month</span>
                              <div className="flex items-center gap-2">
                                  {data.savings.monthly_deposits > 0 && (
                                      <span className="text-emerald-600 dark:text-emerald-400">+{amount(data.savings.monthly_deposits)}</span>
                                  )}
                                  {data.savings.monthly_withdrawals > 0 && (
                                      <span className="text-rose-500 dark:text-rose-400">-{amount(data.savings.monthly_withdrawals)}</span>
                                  )}
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{amount(data.savings.monthly_total)}</span>
                              </div>
                          </div>
                          {data.savings.rows.length ? (
                              data.savings.rows.map((row) => (
                                  <div key={row.id} className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                      <div className="flex items-center gap-1.5">
                                          <span className={`rounded-full px-1.5 py-0.5 font-medium ${row.type === 'deposit' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                                              {row.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                          </span>
                                          {row.notes && <span className="truncate max-w-[8rem]">{row.notes}</span>}
                                      </div>
                                      <span className={row.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                                          {row.type === 'deposit' ? '+' : '-'}{amount(row.amount)}
                                      </span>
                                  </div>
                              ))
                          ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400">No entries this month</p>
                          )}
                      </div>
                  ),
              },
          ]
        : [];

    return (
        <div className={`flex flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-slate-800 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}>
            <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Balance Sheet</h2>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{data?.month ?? 'Loading month...'}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {isLoading && <p className="text-xs text-slate-500 dark:text-slate-400">Loading balance sheet...</p>}

                {!isLoading && error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}

                {!isLoading && !error && data && (
                    <div className="space-y-2">
                        {sections.map((section) => {
                            const isOpen = openSection === section.key;
                            return (
                                <div key={section.key} className="rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:bg-slate-700/50 dark:shadow-[0_2px_12px_rgba(0,0,0,0.30)]">
                                    <button
                                        type="button"
                                        onClick={() => setOpenSection(isOpen ? null : section.key)}
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                                    >
                                        <div className={`inline-flex ${pillBase} ${section.pillClass}`}>{section.label}</div>
                                        {section.amountNode}
                                    </button>

                                    {isOpen && <div className="border-t border-slate-100 px-3 py-2.5 dark:border-slate-600/60">{section.content}</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Roll over</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{amount(data?.roll_over.total ?? 0)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
    const renderModule = (id: string, title: string, subtitle: string, className = '') => {
        if (id === 'balance-sheet') return <BalanceSheetCard className={className} />;
        return <ModuleCard title={title} subtitle={subtitle} className={className} />;
    };

    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

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

    return (
        <>
            <Head title="Dashboard" />
            <DashboardHeader />

            <div className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] min-h-screen bg-slate-200 bg-cover bg-center bg-no-repeat pt-20 dark:bg-slate-900">

                {/* ── Mobile: horizontal scroll-snap carousel ──────────────── */}
                <div className="flex h-[calc(100vh-5rem)] flex-col md:hidden">
                    <div
                        ref={carouselRef}
                        onScroll={handleScroll}
                        className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-scroll px-4 [scroll-padding:0_1rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {MODULES.map((mod) => (
                            <div key={mod.id} className="w-[calc(100vw-2rem)] shrink-0 snap-start">
                                {renderModule(mod.id, mod.title, mod.subtitle, 'h-full')}
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
                                        ? 'w-6 bg-slate-700 dark:bg-slate-200'
                                        : 'w-2 bg-slate-400/50 dark:bg-slate-600'
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

                        {/* Row 2 — Purchase History (4) + Creator Suite (8) */}
                        <ModuleCard
                            title="Purchase History"
                            subtitle="All your purchases"
                            className="col-span-4 min-h-80"
                        />
                        <ModuleCard
                            title="Creator Suite"
                            subtitle="Add and manage entries"
                            className="col-span-8 min-h-80"
                        />

                    </div>
                </div>

            </div>
        </>
    );
}
