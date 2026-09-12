import { apiFetch, errorMessage } from '@/api/client';
import { greyBtnFillCls } from '@/components/creator-suite/shared';
import { dashboardCopy } from '@/config/dashboard-copy';
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
                    <span className="ml-1 font-normal text-slate-400 dark:text-neutral-500">{dashboardCopy.budgetEdit.optional}</span>
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
                    placeholder={placeholder ?? dashboardCopy.budgetEdit.amountPlaceholder}
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
    const t = dashboardCopy.budgetEdit;

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
            setFormError(t.errPurchases);
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
                setFormError(t.errCategory);
                return;
            }
            clean.push({ domain: 'purchase', category_id: id, amount_cents: cents });
        }

        let billsCents: number | null = null;
        if (billsManual) {
            const parsed = majorInputToCents(bills);
            if (parsed === null || Number.isNaN(parsed)) {
                setFormError(t.errRecurring);
                return;
            }
            billsCents = parsed;
        }

        const debtCents = majorInputToCents(debtPlan);
        const saveCents = majorInputToCents(savePlan);
        if (Number.isNaN(debtCents) || Number.isNaN(saveCents)) {
            setFormError(t.errOptional);
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
                toast: t.savedToast,
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
                                ? t.spentSoFar(fromCents(cat.actual_cents))
                                : t.nothingSpent}
                            {!enabled && capped ? t.limitSuffix(fromCents(parsedCap(cat.id) ?? 0)) : ''}
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
                        {enabled ? t.close : t.setLimit}
                    </button>
                </div>
                {enabled && (
                    <div className="mt-2">
                        <AmountField
                            id={`cap-${cat.id}`}
                            label={t.limitFor(cat.name)}
                            hideLabel
                            value={categoryCaps[cat.id] ?? ''}
                            onChange={(v) => setCategoryCaps((prev) => ({ ...prev, [cat.id]: v }))}
                            symbol={symbol}
                            placeholder={t.amountPlaceholder}
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
                    <SheetTitle>{t.title(monthLabel(data.month, auth.user.locale))}</SheetTitle>
                    <SheetDescription>
                        {t.description}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8 px-5 py-5">
                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            {t.purchases}
                        </p>
                        <AmountField
                            id="budget-global"
                            label={t.purchasesLabel}
                            hint={t.purchasesHint}
                            value={global}
                            onChange={setGlobal}
                            symbol={symbol}
                        />
                        {data.discretionary.actual_cents > 0 && (
                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                {t.alreadySpent(fromCents(data.discretionary.actual_cents))}
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
                                    ? t.capsOver(fromCents(Math.abs(unallocated)))
                                    : t.leftoverUncapped(fromCents(unallocated))}
                            </p>
                        )}
                    </section>

                    {data.purchase_categories.length > 0 && (
                        <section className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-neutral-100">
                                    {t.splitByCategory}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                    {t.splitHint}
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
                                        ? t.hideExtra
                                        : withSpend.length === 0 && !hasAnyCap
                                          ? t.chooseFrom(hiddenQuietCount)
                                          : t.showMoreCategories(hiddenQuietCount)}
                                </button>
                            )}
                        </section>
                    )}

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            {t.recurring}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-neutral-300">
                            {t.recurringIntro}
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
                                    <span className="text-slate-800 dark:text-neutral-100">{t.thisMonthsRecurring}</span>
                                    <span className="tabular-nums">{fromCents(data.bills.plan_cents)}</span>
                                </li>
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-neutral-400">
                                {t.noStreams}
                            </p>
                        )}
                        {billsManual ? (
                            <AmountField
                                id="budget-bills"
                                label={t.customRecurring}
                                hint={t.customRecurringHint}
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
                            {billsManual ? t.backToAuto : t.useDifferentTotal}
                        </button>
                    </section>

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            {t.debts}
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
                                                {t.left(fromCents(debt.remaining_cents))}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                                            {t.ofOriginally(fromCents(debt.original_cents))}
                                            {debt.paid_this_month_cents > 0
                                                ? t.paidThisMonth(fromCents(debt.paid_this_month_cents))
                                                : ''}
                                        </p>
                                    </li>
                                ))}
                                {data.debts.open.length > 1 && (
                                    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium">
                                        <span className="text-slate-800 dark:text-neutral-100">{t.stillOwed}</span>
                                        <span className="tabular-nums">{fromCents(data.debts.remaining_cents)}</span>
                                    </li>
                                )}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-neutral-400">{t.noOpenDebts}</p>
                        )}
                        {data.debts.open.length > 0 && (
                            <AmountField
                                id="budget-debt"
                                label={t.debtTarget}
                                hint={t.debtHint}
                                value={debtPlan}
                                onChange={setDebtPlan}
                                symbol={symbol}
                                placeholder={t.noTarget}
                                optional
                            />
                        )}
                    </section>

                    <section className="space-y-3">
                        <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                            {t.savings}
                        </p>
                        <AmountField
                            id="budget-save"
                            label={t.saveTarget}
                            hint={
                                data.savings_this_month_cents !== 0
                                    ? t.saveHintSoFar(fromCents(data.savings_this_month_cents))
                                    : t.saveHintLedger
                            }
                            value={savePlan}
                            onChange={setSavePlan}
                            symbol={symbol}
                            placeholder={t.noTarget}
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
                        {saving ? t.saving : t.save}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
