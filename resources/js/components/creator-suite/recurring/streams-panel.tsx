import { apiFetch, apiFetchList, errorMessage, isNotFound, unwrapData } from '@/api/client';
import { ledgerCopy } from '@/config/ledger-copy';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { useFormatMoney } from '@/hooks/use-format-money';
import type { RecurringCategory, RecurringEntry, RecurringStream } from '@/types/api';
import { MutableRefObject, useEffect, useState } from 'react';
import {
    defaultDayOfMonth,
    fmtRecurringFreq,
    RecurringPriceScheduleFields,
    ScheduleHistory,
    ToggleSwitch,
    type RecurringPriceForm,
} from '../schedule-primitives';
import {
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    inputCls,
    ListRow,
    ListStack,
    LoadingRows,
    RowActions,
    SplitPane,
    StatusChip,
    dropById,
    instrumentDanger,
    instrumentRemoveConfirm,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    secondaryBtnCls,
    selectCls,
    todayStr,
} from '../shared';

export function currentEntry(s: RecurringStream): RecurringEntry | null {
    if (!s.entries?.length) return null;
    return s.entries.find((e) => e.active && !e.end_date) ?? s.entries[0] ?? null;
}

function toggleMeta(s: RecurringStream): {
    switchOn: boolean;
    badge: { label: string; color: 'amber' | 'teal' } | null;
    pendingCancel: boolean;
} {
    if (s.pending_active !== null) {
        return {
            switchOn: s.pending_active,
            badge: s.pending_active
                ? { label: ledgerCopy.recurring.resumePending, color: 'teal' }
                : { label: ledgerCopy.recurring.pausePending, color: 'amber' },
            pendingCancel: true,
        };
    }
    return { switchOn: s.active, badge: null, pendingCancel: false };
}

type ToggleAction = { stream: RecurringStream; isCancel: boolean };

function blankPrice(): RecurringPriceForm {
    return {
        amount: '',
        start_date: todayStr(),
        frequency: 'monthly',
        day_of_month: defaultDayOfMonth(),
        day_of_week: String(new Date().getDay()),
    };
}

export function RecurringStreamsPanel({
    active,
    addRef,
}: {
    active: boolean;
    addRef?: MutableRefObject<(() => void) | null>;
}) {
    const fmtAmount = useFormatMoney();
    const [streams, setStreams] = useState<RecurringStream[]>([]);
    const [cats, setCats] = useState<RecurringCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RecurringStream | null>(null);
    const [removeTarget, setRemoveTarget] = useState<RecurringStream | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [toggleAction, setToggleAction] = useState<ToggleAction | null>(null);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blankStream = { name: '', recurring_payment_category_id: '', description: '' };
    const [form, setForm] = useState(blankStream);
    const [priceForm, setPriceForm] = useState(blankPrice);
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);
    const [savingPrice, setSavingPrice] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [s, c] = await Promise.all([
                apiFetchList<RecurringStream>('/api/v1/recurring-payments/streams'),
                apiFetchList<RecurringCategory>('/api/v1/recurring-payments/categories'),
            ]);
            setStreams(s);
            setCats(c);
            setFetched(true);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) void load();
    }, [active, fetched]);

    const selectRow = (s: RecurringStream) => {
        setSelected(s);
        setForm({
            name: s.name,
            recurring_payment_category_id: String(s.recurring_payment_category_id ?? ''),
            description: s.description ?? '',
        });
        setShowPriceUpdate(false);
        setError(null);
        setSheetOpen(true);
    };

    const reset = () => {
        setSelected(null);
        setForm(blankStream);
        setPriceForm(blankPrice());
        setShowPriceUpdate(false);
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm(blankStream);
                setPriceForm(blankPrice());
                setShowPriceUpdate(false);
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, [addRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                const body = {
                    name: form.name,
                    recurring_payment_category_id: form.recurring_payment_category_id
                        ? Number(form.recurring_payment_category_id)
                        : null,
                    description: form.description || null,
                };
                await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.common.saved,
                });
            } else {
                const body: Record<string, unknown> = {
                    name: form.name,
                    recurring_payment_category_id: form.recurring_payment_category_id
                        ? Number(form.recurring_payment_category_id)
                        : null,
                    description: form.description || null,
                    amount_cents: majorInputToCents(priceForm.amount),
                    frequency: priceForm.frequency,
                    start_date: priceForm.start_date,
                };
                if (priceForm.frequency === 'weekly') {
                    body.day_of_week = Number(priceForm.day_of_week);
                } else {
                    body.day_of_month = Number(priceForm.day_of_month);
                }
                await apiFetch('/api/v1/recurring-payments/streams', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.recurring.streamAdded,
                });
            }
            reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handlePriceUpdate = async (e: React.FormEvent) => {
        if (!selected) return;
        e.preventDefault();
        setSavingPrice(true);
        setError(null);
        try {
            const body: Record<string, unknown> = {
                amount_cents: majorInputToCents(priceForm.amount),
                start_date: priceForm.start_date,
                frequency: priceForm.frequency,
            };
            if (priceForm.frequency === 'weekly') {
                body.day_of_week = Number(priceForm.day_of_week);
            } else {
                body.day_of_month = Number(priceForm.day_of_month);
            }
            await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}/update-price`, {
                method: 'POST',
                body: JSON.stringify(body),
                toast: ledgerCopy.recurring.priceUpdated,
            });
            setShowPriceUpdate(false);
            setPriceForm(blankPrice());
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSavingPrice(false);
        }
    };

    const handleRemove = async (s: RecurringStream) => {
        const hard = Boolean(s.can_hard_delete);
        setRemoveTarget(null);
        setRemovingId(s.id);
        try {
            await apiFetch(
                hard ? `/api/v1/recurring-payments/streams/${s.id}/force` : `/api/v1/recurring-payments/streams/${s.id}`,
                { method: 'DELETE', toast: hard ? ledgerCopy.common.deleted : ledgerCopy.common.archived },
            );
            setStreams(dropById(s.id));
            if (selected?.id === s.id) reset();
        } catch (err: unknown) {
            if (isNotFound(err)) {
                setStreams(dropById(s.id));
                if (selected?.id === s.id) reset();
                return;
            }
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const execToggle = async (s: RecurringStream) => {
        setToggling(true);
        setToggleAction(null);
        try {
            const res = await apiFetch<RecurringStream | { data: RecurringStream }>(
                `/api/v1/recurring-payments/streams/${s.id}/toggle`,
                { method: 'PATCH', toast: ledgerCopy.common.updated },
            );
            const updated = unwrapData(res);
            setStreams((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
            if (selected?.id === s.id) setSelected(updated);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setToggling(false);
        }
    };

    const requestToggle = (s: RecurringStream, e: React.MouseEvent) => {
        e.stopPropagation();
        if (s.pending_active !== null) {
            void execToggle(s);
        } else {
            setToggleAction({ stream: s, isCancel: false });
        }
    };

    const entry = selected ? currentEntry(selected) : null;
    const meta = selected ? toggleMeta(selected) : null;

    const formContent = (
        <div className="space-y-4">
            {selected && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-neutral-800/50">
                    {entry ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
                                    {fmtAmount(entry.amount_cents)}
                                    <span className="ml-1 text-sm font-normal text-slate-500 dark:text-neutral-400">
                                        / {fmtRecurringFreq(entry.frequency)}
                                    </span>
                                </p>
                                {entry.day_of_month != null && entry.frequency !== 'weekly' && (
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                        {ledgerCopy.recurring.dayOfEach(entry.day_of_month, entry.frequency === 'yearly' ? ledgerCopy.recurring.year : ledgerCopy.recurring.month)}
                                    </p>
                                )}
                                {entry.day_of_week != null && entry.frequency === 'weekly' && (
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                        {ledgerCopy.recurring.everyShortDay(ledgerCopy.recurring.shortDays[entry.day_of_week])}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
                                        {meta!.pendingCancel
                                            ? meta!.badge!.label
                                            : selected.active
                                              ? ledgerCopy.common.active
                                              : ledgerCopy.common.paused}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-neutral-500">
                                        {meta!.pendingCancel
                                            ? ledgerCopy.recurring.cancelQueued
                                            : ledgerCopy.recurring.takesEffect}
                                    </p>
                                </div>
                                <ToggleSwitch
                                    on={meta!.switchOn}
                                    disabled={toggling}
                                    label={selected.active ? ledgerCopy.recurring.pauseStream : ledgerCopy.recurring.resumeStream}
                                    onClick={(e) => requestToggle(selected, e)}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 dark:text-neutral-500">{ledgerCopy.recurring.noPrice}</p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && !showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                <Field label={ledgerCopy.common.name}>
                    <input
                        type="text"
                        required
                        maxLength={64}
                        className={inputCls}
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                </Field>
                <Field label={ledgerCopy.common.category}>
                    <select
                        required
                        className={selectCls}
                        value={form.recurring_payment_category_id}
                        onChange={(e) => setForm((f) => ({ ...f, recurring_payment_category_id: e.target.value }))}
                    >
                        <option value="">{ledgerCopy.recurring.selectCategory}</option>
                        {cats
                            .filter((c) => !c.deleted_at)
                            .map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </Field>
                <Field label={ledgerCopy.common.descriptionOptional}>
                    <input
                        type="text"
                        maxLength={255}
                        className={inputCls}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                </Field>

                {!selected && <RecurringPriceScheduleFields priceForm={priceForm} setPriceForm={setPriceForm} />}

                <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
            </form>

            {selected && (
                <>
                    <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
                        {!showPriceUpdate ? (
                            <button type="button" onClick={() => setShowPriceUpdate(true)} className={secondaryBtnCls}>
                                {ledgerCopy.recurring.updatePrice}
                            </button>
                        ) : (
                            <form onSubmit={handlePriceUpdate} className="space-y-3">
                                <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">{ledgerCopy.recurring.updatePriceTitle}</p>
                                {error && showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                                <RecurringPriceScheduleFields
                                    priceForm={priceForm}
                                    setPriceForm={setPriceForm}
                                    amountLabel={ledgerCopy.recurring.newAmount}
                                    startDateLabel={ledgerCopy.recurring.effectiveFrom}
                                />
                                <FormActions
                                    isEdit={true}
                                    saving={savingPrice}
                                    onCancel={() => {
                                        setShowPriceUpdate(false);
                                        setPriceForm(blankPrice());
                                    }}
                                    saveLabel={ledgerCopy.recurring.applyPrice}
                                />
                            </form>
                        )}
                    </div>

                    <ScheduleHistory
                        title={ledgerCopy.recurring.priceHistory}
                        rows={selected.entries ?? []}
                        formatFreq={fmtRecurringFreq}
                    />
                </>
            )}
        </div>
    );

    return (
        <>
            {removeTarget && (
                <ConfirmModal
                    {...instrumentRemoveConfirm(
                        removeTarget.name,
                        removeTarget.can_hard_delete,
                        ledgerCopy.recurring.archiveStream(removeTarget.name),
                    )}
                    onConfirm={() => handleRemove(removeTarget)}
                    onCancel={() => setRemoveTarget(null)}
                />
            )}

            {toggleAction && !toggleAction.isCancel && (
                <ConfirmModal
                    message={
                        toggleAction.stream.active
                            ? ledgerCopy.recurring.pauseAfterCharge(toggleAction.stream.name)
                            : ledgerCopy.recurring.resumeAfterCharge(toggleAction.stream.name)
                    }
                    confirmLabel={toggleAction.stream.active ? ledgerCopy.recurring.pauseAfterNext : ledgerCopy.recurring.resumeAfterNext}
                    confirmVariant={toggleAction.stream.active ? 'warning' : 'primary'}
                    onConfirm={() => execToggle(toggleAction.stream)}
                    onCancel={() => setToggleAction(null)}
                />
            )}

            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? ledgerCopy.recurring.editStream : ledgerCopy.recurring.newStream}
                list={
                    <ListStack>
                        {loading && !streams.length && <LoadingRows />}
                        {!loading && !streams.length && <EmptyRows label={ledgerCopy.recurring.noStreams} />}
                        {streams.map((s) => {
                            const e = currentEntry(s);
                            const m = toggleMeta(s);
                            const busy = removingId === s.id;
                            return (
                                <ListRow key={s.id} selected={selected?.id === s.id} busy={busy} onClick={() => selectRow(s)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className={rowTitleCls}>{s.name}</p>
                                                {m.badge && <StatusChip label={m.badge.label} color={m.badge.color} />}
                                                {!s.active && !m.badge && <StatusChip label={ledgerCopy.common.paused} color="amber" />}
                                            </div>
                                            <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                                {s.category?.name ?? ledgerCopy.common.uncategorized}
                                                {e ? ` · ${fmtRecurringFreq(e.frequency)}` : ''}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            {e && (
                                                <span className={`${rowAmountCls} text-slate-800 dark:text-neutral-100`}>
                                                    {fmtAmount(e.amount_cents)}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <ToggleSwitch
                                                    size="sm"
                                                    on={m.switchOn}
                                                    disabled={toggling || busy}
                                                    label={s.active ? ledgerCopy.recurring.pauseStream : ledgerCopy.recurring.resumeStream}
                                                    onClick={(ev) => requestToggle(s, ev)}
                                                />
                                                <RowActions
                                                    onEdit={() => selectRow(s)}
                                                    onDelete={() => setRemoveTarget(s)}
                                                    editDisabled={busy}
                                                    deleteDisabled={busy}
                                                    {...instrumentDanger(s.can_hard_delete)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </ListRow>
                            );
                        })}
                    </ListStack>
                }
                form={formContent}
            />
        </>
    );
}

export { fmtRecurringFreq };
