import { MutableRefObject, useEffect, useRef, useState } from 'react';
import {
    AddButton,
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    ListRow,
    ListStack,
    LoadingRows,
    RecurringCategory,
    RecurringEntry,
    RecurringStream,
    RowActions,
    SplitPane,
    StatusChip,
    SubTabBar,
    TabToolbar,
    apiFetch,
    apiFetchList,
    dateCls,
    inputCls,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    secondaryBtnCls,
    selectCls,
    todayStr,
    useIsMobile,
} from './shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAmount(n: number) {
    return `$${n.toFixed(2)}`;
}

function fmtFreq(freq: string) {
    if (freq === 'yearly') return 'Yearly';
    if (freq === 'weekly') return 'Weekly';
    return 'Monthly';
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Default day-of-month for new subscriptions (today's date). */
function defaultDayOfMonth() {
    return String(new Date().getDate());
}

/** Shared price/schedule fields used in create and update forms. */
function PriceScheduleFields({
    priceForm,
    setPriceForm,
    amountLabel = 'Amount',
    startDateLabel = 'Starts on',
}: {
    priceForm: { amount: string; start_date: string; frequency: string; day_of_month: string; day_of_week: string };
    setPriceForm: React.Dispatch<React.SetStateAction<typeof priceForm>>;
    amountLabel?: string;
    startDateLabel?: string;
}) {
    const isWeekly = priceForm.frequency === 'weekly';

    return (
        <>
            <Field label={amountLabel}>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputCls}
                    value={priceForm.amount}
                    onChange={(e) => setPriceForm((f) => ({ ...f, amount: e.target.value }))}
                />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Frequency">
                    <select
                        className={selectCls}
                        value={priceForm.frequency}
                        onChange={(e) =>
                            setPriceForm((f) => ({
                                ...f,
                                frequency: e.target.value,
                                day_of_week: e.target.value === 'weekly' ? (f.day_of_week || String(new Date().getDay())) : '',
                                day_of_month: e.target.value === 'weekly' ? '' : (f.day_of_month || defaultDayOfMonth()),
                            }))
                        }
                    >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </Field>
                {isWeekly ? (
                    <Field label="Day of week">
                        <select
                            className={selectCls}
                            required
                            value={priceForm.day_of_week}
                            onChange={(e) => setPriceForm((f) => ({ ...f, day_of_week: e.target.value }))}
                        >
                            {WEEKDAYS.map((label, value) => (
                                <option key={value} value={String(value)}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                ) : (
                    <Field label="Day of month">
                        <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            className={inputCls}
                            value={priceForm.day_of_month}
                            onChange={(e) => setPriceForm((f) => ({ ...f, day_of_month: e.target.value }))}
                        />
                    </Field>
                )}
            </div>
            <Field label={startDateLabel}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={priceForm.start_date}
                    onChange={(e) => setPriceForm((f) => ({ ...f, start_date: e.target.value }))}
                />
            </Field>
        </>
    );
}

/** Find the most recent / current active price entry for a stream. */
function currentEntry(s: RecurringStream): RecurringEntry | null {
    if (!s.entries?.length) return null;
    return s.entries.find((e) => e.active && !e.end_date) ?? s.entries[0] ?? null;
}

// ---------------------------------------------------------------------------
// Price History — collapsible section inside the edit pane
// ---------------------------------------------------------------------------

function PriceHistory({ entries }: { entries: RecurringEntry[] }) {
    const [open, setOpen] = useState(false);
    if (!entries.length) return null;

    return (
        <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
                <span>Price History ({entries.length})</span>
                <span className="text-xs opacity-60">{open ? '▲ Hide' : '▼ Show'}</span>
            </button>

            {open && (
                <div className="mt-2 space-y-1.5">
                    {entries.map((e) => {
                        const isCurrent = e.active && !e.end_date;
                        return (
                            <div
                                key={e.id}
                                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 text-sm ${
                                    isCurrent
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'bg-slate-50 opacity-70 dark:bg-neutral-800/40'
                                }`}
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-semibold text-slate-800 dark:text-neutral-100">
                                        {fmtAmount(e.amount)}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                                        {fmtFreq(e.frequency)}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-neutral-400">
                                    {fmtDate(e.start_date)}
                                    {e.end_date ? ` → ${fmtDate(e.end_date)}` : ' → now'}
                                </span>
                                {isCurrent && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        current
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Toggle switch used in both list row and edit pane
// ---------------------------------------------------------------------------

/**
 * Returns the display state for a stream's toggle:
 * - What the switch should show (derived from the live + pending state)
 * - What label/badge to surface
 */
function toggleMeta(s: RecurringStream): {
    switchOn: boolean;
    badge: { label: string; color: 'amber' | 'teal' } | null;
    pendingCancel: boolean;
} {
    if (s.pending_active !== null) {
        // A change is queued — show the future state visually
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

function ToggleSwitch({
    on,
    size = 'md',
    disabled,
    onClick,
}: {
    on: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    onClick: (e: React.MouseEvent) => void;
}) {
    const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
    const thumb = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const thumbOn = size === 'sm' ? 'translate-x-[18px]' : 'translate-x-6';
    const thumbOff = 'translate-x-0.5';

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${track} ${
                on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-neutral-600'
            }`}
        >
            <span
                className={`inline-block transform rounded-full bg-white shadow transition-transform ${thumb} ${on ? thumbOn : thumbOff}`}
            />
        </button>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Streams (active)
// ---------------------------------------------------------------------------

type ToggleAction = { stream: RecurringStream; isCancel: boolean };
type ArchiveTarget = RecurringStream;

function StreamsTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [streams, setStreams] = useState<RecurringStream[]>([]);
    const [cats, setCats] = useState<RecurringCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RecurringStream | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null);
    const [toggleAction, setToggleAction] = useState<ToggleAction | null>(null);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blankStream = { name: '', recurring_payment_category_id: '', description: '' };
    const [form, setForm] = useState(blankStream);
    const blankPrice = () => ({
        amount: '',
        start_date: todayStr(),
        frequency: 'monthly',
        day_of_month: defaultDayOfMonth(),
        day_of_week: String(new Date().getDay()),
    });
    const [priceForm, setPriceForm] = useState(blankPrice());
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) load();
    }, [active, fetched]);

    const selectRow = (s: RecurringStream) => {
        setSelected(s);
        setForm({ name: s.name, recurring_payment_category_id: String(s.recurring_payment_category_id ?? ''), description: s.description ?? '' });
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                const body = {
                    name: form.name,
                    recurring_payment_category_id: form.recurring_payment_category_id ? Number(form.recurring_payment_category_id) : null,
                    description: form.description || null,
                };
                await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                const body: Record<string, unknown> = {
                    name: form.name,
                    recurring_payment_category_id: form.recurring_payment_category_id ? Number(form.recurring_payment_category_id) : null,
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
                await apiFetch('/api/v1/recurring-payments/streams', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
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
            await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}/update-price`, { method: 'POST', body: JSON.stringify(body) });
            setShowPriceUpdate(false);
            setPriceForm(blankPrice());
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingPrice(false);
        }
    };

    const handleArchive = async (s: RecurringStream) => {
        try {
            await apiFetch(`/api/v1/recurring-payments/streams/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setArchiveTarget(null);
    };

    /** Perform the toggle API call immediately (cancel) or after confirm (queue). */
    const execToggle = async (s: RecurringStream) => {
        setToggling(true);
        setToggleAction(null);
        try {
            const res = await apiFetch<{ data: RecurringStream }>(`/api/v1/recurring-payments/streams/${s.id}/toggle`, { method: 'PATCH' });
            const updated: RecurringStream = (res as any).data ?? res;
            setStreams((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
            if (selected?.id === s.id) setSelected(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setToggling(false);
        }
    };

    /** Click on toggle: cancel immediately (no confirm) or show confirm to queue. */
    const requestToggle = (s: RecurringStream, e: React.MouseEvent) => {
        e.stopPropagation();
        if (s.pending_active !== null) {
            // Cancel pending — no confirm needed, this is a safe undo
            execToggle(s);
        } else {
            setToggleAction({ stream: s, isCancel: false });
        }
    };

    // -----------------------------------------------------------------------
    // Edit pane content
    // -----------------------------------------------------------------------

    const entry = selected ? currentEntry(selected) : null;
    const meta = selected ? toggleMeta(selected) : null;

    const formContent = (
        <div className="space-y-4">
            {/* Current price summary — shown when editing an existing stream */}
            {selected && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-neutral-800/50">
                    {entry ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
                                    {fmtAmount(entry.amount)}
                                    <span className="ml-1 text-sm font-normal text-slate-500 dark:text-neutral-400">
                                        / {fmtFreq(entry.frequency)}
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
                            {/* Pause/resume toggle with pending state */}
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

                {/* Initial price — required when creating a new stream */}
                {!selected && <PriceScheduleFields priceForm={priceForm} setPriceForm={setPriceForm} />}

                <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
            </form>

            {/* Price update form + history — only when editing */}
            {selected && (
                <>
                    <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
                        {!showPriceUpdate ? (
                            <button onClick={() => setShowPriceUpdate(true)} className={secondaryBtnCls}>
                                + Update subscription price
                            </button>
                        ) : (
                            <form onSubmit={handlePriceUpdate} className="space-y-3">
                                <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">Update Price</p>
                                {error && showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                                <PriceScheduleFields
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

                    <PriceHistory entries={selected.entries ?? []} />
                </>
            )}
        </div>
    );

    return (
        <>
            {/* Archive confirm */}
            {archiveTarget && (
                <ConfirmModal
                    message={`Archive "${archiveTarget.name}"? You can restore it later from the Archive tab.`}
                    confirmLabel="Archive"
                    confirmVariant="warning"
                    onConfirm={() => handleArchive(archiveTarget)}
                    onCancel={() => setArchiveTarget(null)}
                />
            )}

            {/* Toggle confirm — only shown when queuing a new change (not canceling) */}
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
                        {loading && <LoadingRows />}
                        {!loading && !streams.length && <EmptyRows label="No recurring streams yet." />}
                        {streams.map((s) => {
                            const e = currentEntry(s);
                            const m = toggleMeta(s);
                            return (
                                <ListRow key={s.id} selected={selected?.id === s.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Left: name + details */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className={rowTitleCls}>{s.name}</p>
                                                {m.badge && (
                                                    <StatusChip label={m.badge.label} color={m.badge.color} />
                                                )}
                                                {!s.active && !m.badge && (
                                                    <StatusChip label="Paused" color="amber" />
                                                )}
                                            </div>
                                            <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                                {s.category?.name ?? 'Uncategorized'}
                                                {e ? ` · ${fmtFreq(e.frequency)}` : ''}
                                            </p>
                                        </div>

                                        {/* Right: amount + toggle + actions */}
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
                                                    disabled={toggling}
                                                    onClick={(ev) => requestToggle(s, ev)}
                                                />
                                                <RowActions onEdit={() => selectRow(s)} onDelete={() => setArchiveTarget(s)} />
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

// ---------------------------------------------------------------------------
// Sub-tab: Archive (soft-deleted streams)
// ---------------------------------------------------------------------------

function ArchiveTab({ active }: { active: boolean }) {
    const [streams, setStreams] = useState<RecurringStream[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [hardDeleting, setHardDeleting] = useState<number | null>(null);
    const [hardDeleteTarget, setHardDeleteTarget] = useState<RecurringStream | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setStreams(await apiFetchList<RecurringStream>('/api/v1/recurring-payments/streams?archived=1'));
            setFetched(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) load();
    }, [active, fetched]);

    const handleRestore = async (s: RecurringStream) => {
        setRestoring(s.id);
        try {
            await apiFetch(`/api/v1/recurring-payments/streams/${s.id}/restore`, { method: 'PATCH' });
            setStreams((prev) => prev.filter((x) => x.id !== s.id));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRestoring(null);
        }
    };

    const handleHardDelete = async (s: RecurringStream) => {
        setHardDeleting(s.id);
        setHardDeleteTarget(null);
        try {
            const res = await fetch(`/api/v1/recurring-payments/streams/${s.id}/force`, {
                method: 'DELETE',
                headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
            });
            if (res.status === 423) {
                const body = await res.json();
                setError(body.message ?? 'Cannot permanently delete this stream.');
            } else if (res.ok || res.status === 204) {
                setStreams((prev) => prev.filter((x) => x.id !== s.id));
            } else {
                const body = await res.json().catch(() => ({}));
                setError(body.message ?? 'Something went wrong.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setHardDeleting(null);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {error && (
                <div className="mb-3">
                    <ApiError message={error} onDismiss={() => setError(null)} />
                </div>
            )}

            {hardDeleteTarget && (
                <ConfirmModal
                    message={`Permanently delete "${hardDeleteTarget.name}"? This cannot be undone.`}
                    confirmLabel="Delete permanently"
                    confirmVariant="danger"
                    onConfirm={() => handleHardDelete(hardDeleteTarget)}
                    onCancel={() => setHardDeleteTarget(null)}
                />
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
                <ListStack>
                    {loading && <LoadingRows />}
                    {!loading && !streams.length && <EmptyRows label="No archived streams." />}
                    {streams.map((s) => {
                        const e = currentEntry(s);
                        const isRestoring = restoring === s.id;
                        const isDeleting = hardDeleting === s.id;
                        return (
                            <ListRow key={s.id} disabled>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className={`${rowTitleCls} line-through opacity-60`}>{s.name}</p>
                                        <p className={`mt-0.5 truncate ${rowDetailCls} opacity-60`}>
                                            {s.category?.name ?? 'Uncategorized'}
                                            {e ? ` · ${fmtFreq(e.frequency)} · ${fmtAmount(e.amount)}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                        <button
                                            disabled={isRestoring || isDeleting}
                                            onClick={() => handleRestore(s)}
                                            className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                        >
                                            {isRestoring ? 'Restoring…' : 'Restore'}
                                        </button>
                                        <button
                                            disabled={isRestoring || isDeleting}
                                            onClick={() => setHardDeleteTarget(s)}
                                            className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                                        >
                                            {isDeleting ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </ListRow>
                        );
                    })}
                </ListStack>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function RecurringCategoriesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [cats, setCats] = useState<RecurringCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RecurringCategory | null>(null);
    const [confirm, setConfirm] = useState<RecurringCategory | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm] = useState({ name: '' });

    const load = async () => {
        setLoading(true);
        try {
            setCats(await apiFetchList<RecurringCategory>('/api/v1/recurring-payments/categories'));
            setFetched(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) load();
    }, [active, fetched]);

    const selectRow = (c: RecurringCategory) => {
        setSelected(c);
        setForm({ name: c.name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => {
        setSelected(null);
        setForm({ name: '' });
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm({ name: '' });
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                await apiFetch(`/api/v1/recurring-payments/categories/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/api/v1/recurring-payments/categories', { method: 'POST', body: JSON.stringify(form) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c: RecurringCategory) => {
        try {
            await apiFetch(`/api/v1/recurring-payments/categories/${c.id}`, { method: 'DELETE' });
            if (selected?.id === c.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value })}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Remove category "${confirm.name}"?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No recurring categories." />}
                        {cats.map((c) => (
                            <ListRow key={c.id} selected={selected?.id === c.id} disabled={!!c.deleted_at}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className={rowTitleCls}>{c.name}</span>
                                    <div className="flex items-center gap-2">
                                        {c.deleted_at && <StatusChip label="Unlisted" color="amber" />}
                                        {!c.deleted_at && <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />}
                                    </div>
                                </div>
                            </ListRow>
                        ))}
                    </ListStack>
                }
                form={formContent}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Streams', 'Categories', 'Archive'] as const;
type SubTab = (typeof SUBTABS)[number];

export function RecurringTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Streams');
    const addRef = useRef<(() => void) | null>(null);
    const showAdd = sub !== 'Archive';
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                {showAdd && <AddButton onClick={() => addRef.current?.()} />}
            </TabToolbar>
            {sub === 'Streams' && <StreamsTab addRef={addRef} active={active} />}
            {sub === 'Categories' && <RecurringCategoriesTab addRef={addRef} active={active} />}
            {sub === 'Archive' && <ArchiveTab active={active} />}
        </div>
    );
}
