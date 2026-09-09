import { apiFetch, errorMessage } from '@/api/client';
import BudgetEditSheet from '@/components/budget-edit-sheet';
import { greyBtnFillCls } from '@/components/creator-suite/shared';
import { Spinner } from '@/components/ui/spinner';
import { useFinanceData } from '@/contexts/finance-data';
import { useFormatMoney } from '@/hooks/use-format-money';
import { type BudgetRead } from '@/types/api';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

function toneFor(leftCents: number, planCents: number, actualCents: number): string {
    if (leftCents < 0) {
        return 'text-rose-600 dark:text-rose-400';
    }
    if (planCents > 0 && actualCents / planCents >= 0.8) {
        return 'text-amber-600 dark:text-amber-400';
    }
    return 'text-emerald-600 dark:text-emerald-400';
}

function barFill(leftCents: number, planCents: number, actualCents: number): string {
    if (leftCents < 0) {
        return 'bg-rose-500';
    }
    if (planCents > 0 && actualCents / planCents >= 0.8) {
        return 'bg-amber-500';
    }
    return 'bg-emerald-500';
}

function usedRatio(planCents: number, actualCents: number): number {
    if (planCents <= 0) {
        return actualCents > 0 ? 1 : 0;
    }
    return Math.min(1, actualCents / planCents);
}

function MiniBar({
    planCents,
    actualCents,
    leftCents,
}: {
    planCents: number;
    actualCents: number;
    leftCents: number;
}) {
    const width = `${Math.round(usedRatio(planCents, actualCents) * 100)}%`;
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
            <div className={`h-full rounded-full ${barFill(leftCents, planCents, actualCents)}`} style={{ width }} />
        </div>
    );
}

export default function BudgetCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const fromCents = amount;
    const { financeEpoch } = useFinanceData();
    const [data, setData] = useState<BudgetRead | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openBlock, setOpenBlock] = useState<string>('purchases');
    const [editOpen, setEditOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const payload = await apiFetch<BudgetRead>('/api/v1/budget');
            setData(payload);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (financeEpoch > 0) {
            void load(true);
        }
    }, [financeEpoch, load]);

    const disc = data?.discretionary;
    const over = (disc?.left_cents ?? 0) < 0;
    const heroLabel = over ? 'Over by' : 'Left to spend';
    const heroValue = disc ? fromCents(Math.abs(disc.left_cents)) : '';
    const heroTone = disc ? toneFor(disc.left_cents, disc.plan_cents, disc.actual_cents) : '';

    return (
        <div
            className={`flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">Budget</h2>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">What you meant to spend</p>
                </div>
                <button
                    type="button"
                    onClick={() => void load(true)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label="Refresh budget"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
                {!error && isLoading && !data && <Spinner label="Loading budget" />}
                {!error && data && !data.has_plan && (
                    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                        <p className="text-sm text-slate-500 dark:text-neutral-400">No spending plan this month.</p>
                        <button
                            type="button"
                            onClick={() => setEditOpen(true)}
                            className={`mt-3 rounded-full px-4 py-1.5 text-sm font-medium ${greyBtnFillCls}`}
                        >
                            Set a monthly spending plan
                        </button>
                    </div>
                )}
                {!error && data && data.has_plan && disc && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                                {heroLabel}
                            </p>
                            <p className={`mt-0.5 text-3xl font-semibold tabular-nums ${heroTone}`}>{heroValue}</p>
                            <div className="mt-2">
                                <MiniBar
                                    planCents={disc.plan_cents}
                                    actualCents={disc.actual_cents}
                                    leftCents={disc.left_cents}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
                                {fromCents(disc.actual_cents)} of {fromCents(disc.plan_cents)}
                                {' · '}
                                {data.is_locked
                                    ? 'Month closed'
                                    : data.days_left === 1
                                      ? '1 day left'
                                      : `${data.days_left} days left`}
                            </p>
                        </div>

                        <Collapsible
                            title="Purchases"
                            open={openBlock === 'purchases'}
                            onToggle={() => setOpenBlock((v) => (v === 'purchases' ? '' : 'purchases'))}
                        >
                            {data.categories.length === 0 && !data.unallocated ? (
                                <p className="text-sm text-slate-500 dark:text-neutral-400">No category caps.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {data.categories.map((row) => (
                                        <EnvelopeRow
                                            key={row.category_id}
                                            name={row.name}
                                            leftCents={row.left_cents}
                                            planCents={row.plan_cents}
                                            actualCents={row.actual_cents}
                                            fromCents={fromCents}
                                        />
                                    ))}
                                    {data.unallocated && (
                                        <EnvelopeRow
                                            name={data.categories.length === 0 ? 'Day-to-day' : 'Everything else'}
                                            leftCents={data.unallocated.left_cents}
                                            planCents={data.unallocated.plan_cents}
                                            actualCents={data.unallocated.actual_cents}
                                            fromCents={fromCents}
                                        />
                                    )}
                                </div>
                            )}
                        </Collapsible>

                        <Collapsible
                            title="Recurring"
                            open={openBlock === 'recurring'}
                            onToggle={() => setOpenBlock((v) => (v === 'recurring' ? '' : 'recurring'))}
                        >
                            <p className="text-sm text-slate-700 dark:text-neutral-200">
                                Posted {fromCents(data.bills.charged_cents)} of {fromCents(data.bills.plan_cents)}{' '}
                                planned
                                {data.bills.auto ? ' (auto)' : ''}
                            </p>
                            {data.bills.charged_cents > data.bills.plan_cents && (
                                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                                    Recurring ran over the plan.
                                </p>
                            )}
                            {data.bills.streams.length > 0 && (
                                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-neutral-300">
                                    {data.bills.streams.map((s) => (
                                        <li key={s.name} className="flex justify-between gap-2">
                                            <span className="truncate">
                                                {s.name}
                                                {s.remaining_cents === 0 && s.charged_cents > 0 ? ' ✓' : ''}
                                            </span>
                                            <span className="shrink-0 tabular-nums">
                                                {s.remaining_cents > 0
                                                    ? `${fromCents(s.remaining_cents)} left`
                                                    : fromCents(s.charged_cents)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Collapsible>

                        <Collapsible
                            title="Obligations"
                            open={openBlock === 'debts'}
                            onToggle={() => setOpenBlock((v) => (v === 'debts' ? '' : 'debts'))}
                        >
                            {data.debts.open.length > 0 ? (
                                <ul className="space-y-2">
                                    {data.debts.open.map((debt) => (
                                        <li key={debt.id} className="text-sm">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <span className="truncate text-slate-800 dark:text-neutral-100">
                                                    {debt.name}
                                                </span>
                                                <span className="shrink-0 tabular-nums text-slate-700 dark:text-neutral-200">
                                                    {fromCents(debt.remaining_cents)} left
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                                of {fromCents(debt.original_cents)}
                                                {debt.paid_this_month_cents > 0
                                                    ? ` · paid ${fromCents(debt.paid_this_month_cents)} this month`
                                                    : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-neutral-400">No open debts.</p>
                            )}
                            {data.debts.open.length > 1 && (
                                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-neutral-100">
                                    Still owed in total {fromCents(data.debts.remaining_cents)}
                                </p>
                            )}
                            <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">
                                Paid this month {fromCents(data.debts.paid_cents)}
                                {data.debts.plan_cents !== null
                                    ? ` of ${fromCents(data.debts.plan_cents)} planned`
                                    : ''}
                            </p>
                        </Collapsible>
                    </div>
                )}
            </div>

            {data && (data.has_plan || editOpen) && (
                <div className="mt-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        disabled={data.is_locked}
                        className="rounded-full bg-sky-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-500"
                    >
                        {data.is_locked ? 'Plan locked with the month' : 'Edit plan'}
                    </button>
                </div>
            )}

            {data && (
                <BudgetEditSheet
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    data={data}
                    onSaved={(next) => setData(next)}
                />
            )}
        </div>
    );
}

function EnvelopeRow({
    name,
    leftCents,
    planCents,
    actualCents,
    fromCents,
}: {
    name: string;
    leftCents: number;
    planCents: number;
    actualCents: number;
    fromCents: (cents: number) => string;
}) {
    const over = leftCents < 0;
    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-slate-800 dark:text-neutral-100">{name}</span>
                <span className={`shrink-0 tabular-nums ${toneFor(leftCents, planCents, actualCents)}`}>
                    {over ? `over ${fromCents(Math.abs(leftCents))}` : `${fromCents(leftCents)} left`}
                </span>
            </div>
            <MiniBar planCents={planCents} actualCents={actualCents} leftCents={leftCents} />
        </div>
    );
}

function Collapsible({
    title,
    open,
    onToggle,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between text-left text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400"
            >
                {title}
                <span className="text-slate-400">{open ? '–' : '+'}</span>
            </button>
            {open && <div className="mt-2">{children}</div>}
        </div>
    );
}
