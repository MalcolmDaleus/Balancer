import { apiFetch, errorMessage } from '@/api/client';
import { innerCardCls } from '@/components/creator-suite/shared';
import { dashboardCopy } from '@/config/dashboard-copy';
import { Spinner } from '@/components/ui/spinner';
import { useFinanceDataOptional } from '@/contexts/finance-data';
import { useFormatMoney } from '@/hooks/use-format-money';
import { type StandingRead } from '@/types/api';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function formatSince(ym: string) {
    const [year, month] = ym.split('-').map(Number);
    if (!year || !month) {
        return ym;
    }

    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
    });
}

function StockRow({
    label,
    value,
    className = '',
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-neutral-300">{label}</span>
            <span className={`font-medium tabular-nums ${className}`}>{value}</span>
        </div>
    );
}

export default function StandingCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const finance = useFinanceDataOptional();
    const copy = dashboardCopy.standing;

    const [data, setData] = useState<StandingRead | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStanding = useCallback(async (silent = false) => {
        if (silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const payload = await apiFetch<StandingRead>('/api/v1/standing');
            setData(payload);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadStanding();
    }, [loadStanding]);

    useEffect(() => {
        if (finance && finance.financeEpoch > 0) {
            void loadStanding(true);
        }
    }, [finance?.financeEpoch, loadStanding]);

    const tenure =
        data === null
            ? null
            : data.months_tracked <= 1
                ? copy.startedThisMonth
                : `${copy.trackingSince(formatSince(data.tracking_since))} · ${copy.monthsTracked(data.months_tracked)}`;

    return (
        <div
            className={`flex flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">{copy.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-200">{copy.subtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadStanding(true)}
                    disabled={isLoading || isRefreshing}
                    aria-label={copy.refresh}
                    className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                    <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {isLoading && <Spinner label={copy.loading} />}

                {!isLoading && error && !data && (
                    <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                )}

                {!isLoading && data && (
                    <div className="flex flex-col gap-4">
                        {error && (
                            <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
                        )}

                        <div>
                            <p className="text-sm text-slate-500 dark:text-neutral-300">{copy.availableCash}</p>
                            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-neutral-50">
                                {amount(data.available_cash_cents)}
                            </p>
                        </div>

                        <div className={`${innerCardCls} space-y-2.5 px-4 py-3.5`}>
                            <StockRow label={copy.savings} value={amount(data.savings_total_cents)} />
                            <StockRow
                                label={copy.stillOwed}
                                value={amount(data.owed_cents)}
                                className={
                                    data.owed_cents > 0
                                        ? 'text-rose-600 dark:text-rose-300'
                                        : 'text-slate-900 dark:text-neutral-100'
                                }
                            />
                        </div>

                        {tenure && (
                            <p className="text-sm text-slate-500 dark:text-neutral-400">{tenure}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
