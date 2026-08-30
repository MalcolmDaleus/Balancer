import { apiFetch, apiFetchList, errorMessage, isNotFound, unwrapData } from '@/api/client';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
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
                ? { label: 'Resume pending', color: 'teal' }
                : { label: 'Pause pending', color: 'amber' },
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

export function RecurringStreamsPanel({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
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
        if (isMobile) setSheetOpen(true);
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
                    toast: 'Saved',
                });
            } else {
                const body: Record<string, unknown> = {
                    name: form.name,
                    recurring_payment_category_id: form.recurring_payment_category_id
                        ? Number(form.recurring_payment_category_id)
                        : null,
                    description: form.description || null,
                    amount: Number(priceForm.amount),
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
                    toast: 'Stream added',
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
                amount: Number(priceForm.amount),
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
                toast: 'Price updated',
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
                { method: 'DELETE', toast: hard ? 'Deleted' : 'Archived' },
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
                { method: 'PATCH', toast: 'Updated' },
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
                                    {fmtAmount(entry.amount)}
                                    <span className="ml-1 text-sm font-normal text-slate-500 dark:text-neutral-400">
                                        / {fmtRecurringFreq(entry.frequency)}
                                    </span>
                                </p>
                                {entry.day_of_month != null && entry.frequency !== 'weekly' && (
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                        Day {entry.day_of_month} of each {entry.frequency === 'yearly' ? 'year' : 'month'}
                                    </p>
                                )}
                                {entry.day_of_week != null && entry.frequency === 'weekly' && (
                                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                        Every {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][entry.day_of_week]}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
                                        {meta!.pendingCancel
                                            ? meta!.badge!.label
                                            : selected.active
                                              ? 'Active'
                                              : 'Paused'}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-neutral-500">
                                        {meta!.pendingCancel
                                            ? 'Click to cancel queued change'
                                            : 'Takes effect after next charge date'}
                                    </p>
                                </div>
                                <ToggleSwitch
                                    on={meta!.switchOn}
                                    disabled={toggling}
                                    label={selected.active ? 'Pause stream' : 'Resume stream'}
                                    onClick={(e) => requestToggle(selected, e)}
                                />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 dark:text-neutral-500">No price set yet — add one below.</p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && !showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                <Field label="Name">
                    <input
                        type="text"
                        required
                        maxLength={64}
                        className={inputCls}
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                </Field>
                <Field label="Category">
                    <select
                        required
                        className={selectCls}
                        value={form.recurring_payment_category_id}
                        onChange={(e) => setForm((f) => ({ ...f, recurring_payment_category_id: e.target.value }))}
                    >
                        <option value="">— select category —</option>
                        {cats
                            .filter((c) => !c.deleted_at)
                            .map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                    </select>
                </Field>
                <Field label="Description (optional)">
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
                                + Update subscription price
                            </button>
                        ) : (
                            <form onSubmit={handlePriceUpdate} className="space-y-3">
                                <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">Update Price</p>
                                {error && showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                                <RecurringPriceScheduleFields
                                    priceForm={priceForm}
                                    setPriceForm={setPriceForm}
                                    amountLabel="New Amount"
                                    startDateLabel="Effective From"
                                />
                                <FormActions
                                    isEdit={true}
                                    saving={savingPrice}
                                    onCancel={() => {
                                        setShowPriceUpdate(false);
                                        setPriceForm(blankPrice());
                                    }}
                                    saveLabel="Apply Price Change"
                                />
                            </form>
                        )}
                    </div>

                    <ScheduleHistory
                        title="Price History"
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
                        `Archive "${removeTarget.name}"? You can restore it later from the Archive tab.`,
                    )}
                    onConfirm={() => handleRemove(removeTarget)}
                    onCancel={() => setRemoveTarget(null)}
                />
            )}

            {toggleAction && !toggleAction.isCancel && (
                <ConfirmModal
                    message={
                        toggleAction.stream.active
                            ? `Pause "${toggleAction.stream.name}" after its next charge? It stays on the balance sheet until then.`
                            : `Resume "${toggleAction.stream.name}" after its next charge?`
                    }
                    confirmLabel={toggleAction.stream.active ? 'Pause after next charge' : 'Resume after next charge'}
                    confirmVariant={toggleAction.stream.active ? 'warning' : 'primary'}
                    onConfirm={() => execToggle(toggleAction.stream)}
                    onCancel={() => setToggleAction(null)}
                />
            )}

            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Stream' : 'New Stream'}
                list={
                    <ListStack>
                        {loading && !streams.length && <LoadingRows />}
                        {!loading && !streams.length && <EmptyRows label="No recurring streams yet." />}
                        {streams.map((s) => {
                            const e = currentEntry(s);
                            const m = toggleMeta(s);
                            const busy = removingId === s.id;
                            return (
                                <ListRow key={s.id} selected={selected?.id === s.id} busy={busy}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className={rowTitleCls}>{s.name}</p>
                                                {m.badge && <StatusChip label={m.badge.label} color={m.badge.color} />}
                                                {!s.active && !m.badge && <StatusChip label="Paused" color="amber" />}
                                            </div>
                                            <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                                {s.category?.name ?? 'Uncategorized'}
                                                {e ? ` · ${fmtRecurringFreq(e.frequency)}` : ''}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            {e && (
                                                <span className={`${rowAmountCls} text-slate-800 dark:text-neutral-100`}>
                                                    {fmtAmount(e.amount)}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <ToggleSwitch
                                                    size="sm"
                                                    on={m.switchOn}
                                                    disabled={toggling || busy}
                                                    label={s.active ? 'Pause stream' : 'Resume stream'}
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
