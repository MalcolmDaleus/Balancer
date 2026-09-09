import { apiFetchList, errorMessage } from '@/api/client';
import { innerCardCls, tintSectionPill } from '@/components/creator-suite/shared';
import { Spinner } from '@/components/ui/spinner';
import { useFinanceDataOptional } from '@/contexts/finance-data';
import { useFormatMoney } from '@/hooks/use-format-money';
import { type BalanceSheetSnapshot } from '@/types/api';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export type { BalanceSheetSnapshot };

const pillBase = 'rounded-full px-2.5 py-0.5 text-sm font-medium';

function formatMonthLabel(month: string) {
    const d = new Date(month + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function DetailRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-neutral-300">{label}</span>
            <span className={`font-medium tabular-nums ${className}`}>{value}</span>
        </div>
    );
}

export default function BalanceSheetHistoryCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const finance = useFinanceDataOptional();

    const [snapshots, setSnapshots] = useState<BalanceSheetSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const signed = (value: number, sign: '+' | '-') => `${sign}${amount(Math.abs(value))}`;

    const loadHistory = useCallback(async (silent = false) => {
        if (silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const rows = await apiFetchList<BalanceSheetSnapshot>('/api/v1/balance-sheet/history?months=24');
            setSnapshots([...rows].sort((a, b) => b.month.localeCompare(a.month)));
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        if (finance && finance.financeEpoch > 0) {
            void loadHistory(true);
        }
    }, [finance?.financeEpoch, loadHistory]);

    return (
        <div
            className={`flex flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">Past Balance Sheets</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-200">Closed monthly snapshots</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadHistory(true)}
                    disabled={isLoading || isRefreshing}
                    aria-label="Refresh history"
                    className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                    <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {isLoading && <Spinner label="Loading history" />}

                {!isLoading && error && !snapshots.length && (
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                )}

                {!isLoading && !error && !snapshots.length && (
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-neutral-300">
                        No closed months yet. When you close a month, its snapshot will appear here.
                    </p>
                )}

                {!isLoading && snapshots.length > 0 && (
                    <div className="space-y-2.5">
                        {error && <p className="mb-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
                        {snapshots.map((snap) => {
                            const isOpen = expandedId === snap.id;
                            return (
                                <div key={snap.id} className={innerCardCls}>
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => setExpandedId(isOpen ? null : snap.id)}
                                        className="flex w-full flex-col gap-2 px-4 py-3.5 text-left sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <p className="text-base font-medium text-slate-900 dark:text-neutral-100">
                                                {formatMonthLabel(snap.month)}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                <span className={`inline-flex ${pillBase} ${tintSectionPill.emerald}`}>
                                                    Income {signed(snap.total_income_cents, '+')}
                                                </span>
                                                <span className={`inline-flex ${pillBase} ${tintSectionPill.red}`}>
                                                    Spent {signed(snap.total_spending_cents, '-')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                                                Roll over
                                            </p>
                                            <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                                                {amount(snap.roll_over_cents)}
                                            </p>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="space-y-2 border-t border-slate-100 px-4 py-3.5 dark:border-neutral-700/60">
                                            <DetailRow label="Income" value={signed(snap.total_income_cents, '+')} className="text-emerald-600 dark:text-emerald-300" />
                                            <DetailRow label="Debt paid" value={signed(snap.total_debt_paid_cents, '-')} className="text-red-600 dark:text-red-300" />
                                            <DetailRow label="Purchases" value={signed(snap.total_spending_cents, '-')} className="text-yellow-700 dark:text-yellow-300" />
                                            <DetailRow label="Recurring" value={signed(snap.total_recurring_cents, '-')} className="text-orange-700 dark:text-orange-300" />
                                            <DetailRow label="Savings (net)" value={amount(snap.savings_snapshot_cents)} />
                                            <DetailRow label="Roll over" value={amount(snap.roll_over_cents)} className="text-slate-900 dark:text-neutral-100" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
