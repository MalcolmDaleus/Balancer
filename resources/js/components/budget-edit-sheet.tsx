import { apiFetch, errorMessage } from '@/api/client';
import { greyBtnFillCls } from '@/components/creator-suite/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import { centsToInput, currencySymbol, majorInputToCents } from '@/lib/money';
import { type SharedData } from '@/types';
import { type BudgetRead } from '@/types/api';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

function monthLabel(ym: string, locale?: string | null): string {
    const [year, month] = ym.split('-').map(Number);
    if (!year || !month) {
        return ym;
    }
    return new Date(year, month - 1, 1).toLocaleString(locale || undefined, {
        month: 'long',
        year: 'numeric',
    });
}

function AmountField({
    id,
    label,
    hint,
    value,
    onChange,
    placeholder,
    symbol,
    optional,
    hideLabel,
}: {
    id: string;
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    symbol: string;
    optional?: boolean;
    hideLabel?: boolean;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className={
                    hideLabel
                        ? 'sr-only'
                        : 'block text-sm font-medium text-slate-800 dark:text-neutral-100'
                }
            >
                {label}
                {optional ? (
                    <span className="ml-1 font-normal text-slate-400 dark:text-neutral-500">optional</span>
                ) : null}
            </label>
            {hint && !hideLabel ? <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">{hint}</p> : null}
            <div className={`${hideLabel ? 'mt-0' : 'mt-1.5'} flex h-10 items-center rounded-md border border-slate-200 bg-white focus-within:ring-1 focus-within:ring-slate-400 dark:border-neutral-700 dark:bg-neutral-950`}>
                <span className="shrink-0 pl-3 text-sm text-slate-500 dark:text-neutral-400">{symbol}</span>
                <input
                    id={id}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-neutral-100"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder ?? '0.00'}
                    autoComplete="off"
                />
            </div>
        </div>
    );
}

export default function BudgetEditSheet({
    open,
    onOpenChange,
    data,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: BudgetRead;
    onSaved: (next: BudgetRead) => void;
}) {
    const isMobile = useIsMobile();
    const amount = useFormatMoney();
    const { auth } = usePage<SharedData>().props;
    const symbol = currencySymbol(auth.user.currency ?? 'USD', auth.user.locale);
    const fromCents = amount;

    const [global, setGlobal] = useState('');
    const [categoryCaps, setCategoryCaps] = useState<Record<number, string>>({});
    const [openCaps, setOpenCaps] = useState<Set<number>>(new Set());
    const [showQuietCategories, setShowQuietCategories] = useState(false);
    const [billsManual, setBillsManual] = useState(false);
    const [bills, setBills] = useState('');
    const [debtPlan, setDebtPlan] = useState('');
    const [savePlan, setSavePlan] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        setGlobal(data.has_plan ? centsToInput(data.discretionary.plan_cents) : '');
        const caps: Record<number, string> = {};
        const enabled = new Set<number>();
        for (const row of data.categories) {
            caps[row.category_id] = centsToInput(row.plan_cents);
            enabled.add(row.category_id);
        }
        setCategoryCaps(caps);
        setOpenCaps(enabled);
        setShowQuietCategories(false);
        setBillsManual(!data.bills.auto);
        setBills(centsToInput(data.bills.plan_cents));
        setDebtPlan(centsToInput(data.debts.plan_cents));
        setSavePlan(data.save ? centsToInput(data.save.plan_cents) : '');
        setFormError(null);
    }, [open, data]);

    const parsedCap = (id: number) => majorInputToCents(categoryCaps[id] ?? '');
    const hasCap = (id: number) => {
        const cents = parsedCap(id);
        return cents !== null && !Number.isNaN(cents) && cents > 0;
    };

    const globalCents = majorInputToCents(global);
    const capTotal = useMemo(() => {
        let sum = 0;
        for (const rawId of Object.keys(categoryCaps)) {
            const parsed = majorInputToCents(categoryCaps[Number(rawId)] ?? '');
            if (parsed && !Number.isNaN(parsed)) {
                sum += parsed;
            }
        }
        return sum;
    }, [categoryCaps]);
    const unallocated =
        typeof globalCents === 'number' && !Number.isNaN(globalCents) ? globalCents - capTotal : null;
    const hasAnyCap = capTotal > 0 || openCaps.size > 0;

    const withSpend = data.purchase_categories.filter((c) => c.actual_cents > 0);
    const quiet = data.purchase_categories.filter((c) => c.actual_cents <= 0);
    const visibleQuiet = quiet.filter((c) => openCaps.has(c.id) || hasCap(c.id) || showQuietCategories);
    const hiddenQuietCount = quiet.filter((c) => !openCaps.has(c.id) && !hasCap(c.id)).length;

    const submit = async () => {
        const discretionary = majorInputToCents(global);
        if (discretionary === null || Number.isNaN(discretionary)) {
            setFormError('Enter how much you want to spend on purchases this month. 0 is allowed.');
            return;
        }

        const clean: Array<{ domain: 'purchase'; category_id: number; amount_cents: number }> = [];
        for (const rawId of Object.keys(categoryCaps)) {
            const id = Number(rawId);
            const cents = majorInputToCents(categoryCaps[id] ?? '');
            if (cents === null || cents === 0) {
                continue;
            }
            if (Number.isNaN(cents)) {
                setFormError('Category limits must be a number.');
                return;
            }
            clean.push({ domain: 'purchase', category_id: id, amount_cents: cents });
        }

        let billsCents: number | null = null;
        if (billsManual) {
            const parsed = majorInputToCents(bills);
            if (parsed === null || Number.isNaN(parsed)) {
                setFormError('Enter a recurring total, or switch back to auto.');
                return;
            }
            billsCents = parsed;
        }

        const debtCents = majorInputToCents(debtPlan);
        const saveCents = majorInputToCents(savePlan);
        if (Number.isNaN(debtCents) || Number.isNaN(saveCents)) {
            setFormError('Optional amounts must be empty or a valid number.');
            return;
        }

        setSaving(true);
        setFormError(null);
        try {
            const next = await apiFetch<BudgetRead>('/api/v1/budget', {
                method: 'PUT',
                body: JSON.stringify({
                    month: data.month,
                    discretionary_cents: discretionary,
                    bills_cents: billsCents,
                    debt_payment_cents: debtCents,
                    save_cents: saveCents,
                    envelopes: clean,
                }),
                toast: 'Plan saved',
            });
            onSaved(next);
            onOpenChange(false);
        } catch (err: unknown) {
            setFormError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const renderCategory = (cat: { id: number; name: string; actual_cents: number }) => {
        const enabled = openCaps.has(cat.id);
        const capped = hasCap(cat.id);
        return (
            <div
                key={cat.id}
                className="rounded-lg border border-slate-200/80 px-3 py-2.5 dark:border-neutral-700/80"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-neutral-100">{cat.name}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            {cat.actual_cents > 0
                                ? `Spent ${fromCents(cat.actual_cents)} so far this month`
                                : 'Nothing spent in this category yet'}
                            {!enabled && capped ? ` · limit ${fromCents(parsedCap(cat.id) ?? 0)}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="shrink-0 text-xs font-medium text-sky-700 dark:text-sky-400"
                        onClick={() => {
                            if (enabled) {
                                setOpenCaps((prev) => {
                                    const next = new Set(prev);
                                    next.delete(cat.id);
                                    return next;
                                });
                                if (!hasCap(cat.id)) {
                                    setCategoryCaps((prev) => {
                                        const next = { ...prev };
                                        delete next[cat.id];
                                        return next;
                                    });
                                }
                                return;
                            }
                            setOpenCaps((prev) => new Set(prev).add(cat.id));
                            setCategoryCaps((prev) => ({
                                ...prev,
                                [cat.id]: prev[cat.id] ?? (cat.actual_cents > 0 ? centsToInput(cat.actual_cents) : ''),
                            }));
                        }}
                    >
                        {enabled ? 'Close' : 'Set a limit'}
                    </button>
                </div>
                {enabled && (
                    <div className="mt-2">
                        <AmountField
                            id={`cap-${cat.id}`}
                            label={`Limit for ${cat.name}`}
                            hideLabel
                            value={categoryCaps[cat.id] ?? ''}
                            onChange={(v) => setCategoryCaps((prev) => ({ ...prev, [cat.id]: v }))}
                            symbol={symbol}
                            placeholder="0.00"
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={isMobile ? 'bottom' : 'right'}
                className={
                    isMobile
                        ? 'max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0'
                        : 'h-full w-full gap-0 overflow-y-auto p-0 sm:max-w-lg'
                }
            >
                <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
                    <SheetTitle>Plan for {monthLabel(data.month, auth.user.locale)}</SheetTitle>
                    <SheetDescription>
                        Tell Balancer what you intend to spend. Unused room stays in your cash — it does not raise next
                        month’s numbers.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8 px-5 py-5">
                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            Purchases
                        </p>
                        <AmountField
                            id="budget-global"
                            label="How much for purchases this month?"
                            hint="Food, shopping, extras — not rent or subscriptions. Those are under Recurring."
                            value={global}
                            onChange={setGlobal}
                            symbol={symbol}
                        />
                        {data.discretionary.actual_cents > 0 && (
                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                You’ve already spent {fromCents(data.discretionary.actual_cents)} on purchases this month.
                            </p>
                        )}
                        {unallocated !== null && hasAnyCap && (
                            <p
                                className={`text-xs ${
                                    unallocated < 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-slate-500 dark:text-neutral-400'
                                }`}
                            >
                                {unallocated < 0
                                    ? `Category limits are ${fromCents(Math.abs(unallocated))} over the purchase total.`
                                    : `${fromCents(unallocated)} of the purchase total has no category limit — that’s fine.`}
                            </p>
                        )}
                    </section>

                    {data.purchase_categories.length > 0 && (
                        <section className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-neutral-100">
                                    Split by category
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                    Optional. Skip this if one overall number is enough.
                                </p>
                            </div>
                            <div className="space-y-2">
                                {withSpend.map(renderCategory)}
                                {visibleQuiet.map(renderCategory)}
                            </div>
                            {(hiddenQuietCount > 0 || showQuietCategories) && quiet.length > 0 && (
                                <button
                                    type="button"
                                    className="text-sm font-medium text-sky-700 dark:text-sky-400"
                                    onClick={() => setShowQuietCategories((v) => !v)}
                                >
                                    {showQuietCategories
                                        ? 'Hide extra categories'
                                        : withSpend.length === 0 && !hasAnyCap
                                          ? `Choose from ${hiddenQuietCount} ${hiddenQuietCount === 1 ? 'category' : 'categories'}`
                                          : `Show ${hiddenQuietCount} more ${hiddenQuietCount === 1 ? 'category' : 'categories'}`}
                                </button>
                            )}
                        </section>
                    )}

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            Recurring
                        </p>
                        <p className="text-sm text-slate-600 dark:text-neutral-300">
                            Filled in from your recurring streams. You don’t need to type these unless a stream changed.
                        </p>
                        {data.bills.streams.length > 0 ? (
                            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 dark:divide-neutral-800 dark:border-neutral-700/80">
                                {data.bills.streams.map((s) => (
                                    <li
                                        key={s.name}
                                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                                    >
                                        <span className="truncate text-slate-800 dark:text-neutral-100">{s.name}</span>
                                        <span className="shrink-0 tabular-nums text-slate-600 dark:text-neutral-300">
                                            {fromCents(s.charged_cents + s.remaining_cents)}
                                        </span>
                                    </li>
                                ))}
                                <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
                                    <span className="text-slate-800 dark:text-neutral-100">This month’s recurring</span>
                                    <span className="tabular-nums">{fromCents(data.bills.plan_cents)}</span>
                                </li>
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-neutral-400">
                                No recurring streams yet — add them in the Ledger and this will fill in.
                            </p>
                        )}
                        {billsManual ? (
                            <AmountField
                                id="budget-bills"
                                label="Custom recurring total"
                                hint="Overrides the automatic total from streams."
                                value={bills}
                                onChange={setBills}
                                symbol={symbol}
                            />
                        ) : null}
                        <button
                            type="button"
                            className="text-sm font-medium text-sky-700 dark:text-sky-400"
                            onClick={() => {
                                if (billsManual) {
                                    setBills(centsToInput(data.bills.plan_cents));
                                }
                                setBillsManual((v) => !v);
                            }}
                        >
                            {billsManual ? 'Back to automatic recurring' : 'Use a different recurring total'}
                        </button>
                    </section>

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            Debts
                        </p>
                        {data.debts.open.length > 0 ? (
                            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 dark:divide-neutral-800 dark:border-neutral-700/80">
                                {data.debts.open.map((debt) => (
                                    <li key={debt.id} className="px-3 py-2.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-neutral-100">
                                                {debt.name}
                                            </span>
                                            <span className="shrink-0 text-sm tabular-nums text-slate-800 dark:text-neutral-100">
                                                {fromCents(debt.remaining_cents)} left
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                            of {fromCents(debt.original_cents)} originally
                                            {debt.paid_this_month_cents > 0
                                                ? ` · paid ${fromCents(debt.paid_this_month_cents)} this month`
                                                : ''}
                                        </p>
                                    </li>
                                ))}
                                {data.debts.open.length > 1 && (
                                    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
                                        <span className="text-slate-800 dark:text-neutral-100">Still owed in total</span>
                                        <span className="tabular-nums">{fromCents(data.debts.remaining_cents)}</span>
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-neutral-400">No open debts.</p>
                        )}
                        {data.debts.open.length > 0 && (
                            <AmountField
                                id="budget-debt"
                                label="How much do you want to pay toward these this month?"
                                hint="A target across all open debts — paying more or less is always allowed."
                                value={debtPlan}
                                onChange={setDebtPlan}
                                symbol={symbol}
                                placeholder="No target"
                                optional
                            />
                        )}
                    </section>

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            Savings
                        </p>
                        <AmountField
                            id="budget-save"
                            label="How much do you want to put aside this month?"
                            hint={
                                data.savings_this_month_cents !== 0
                                    ? `This month so far: ${fromCents(data.savings_this_month_cents)}.`
                                    : 'A target only. Deposits and withdrawals still go in the Ledger.'
                            }
                            value={savePlan}
                            onChange={setSavePlan}
                            symbol={symbol}
                            placeholder="No target"
                            optional
                        />
                    </section>

                    {formError && <p className="text-sm text-rose-600 dark:text-rose-400">{formError}</p>}

                    <Button
                        type="button"
                        className={`w-full ${greyBtnFillCls}`}
                        disabled={saving}
                        onClick={() => void submit()}
                    >
                        {saving ? 'Saving…' : 'Save this month’s plan'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
