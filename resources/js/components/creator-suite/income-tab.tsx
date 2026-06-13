import { MutableRefObject, useEffect, useRef, useState } from 'react';
import {
    AddButton,
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    IncomeEntry,
    ListRow,
    ListStack,
    LoadingRows,
    RegularIncomeSchedule,
    RegularIncomeScheduleVersion,
    RowActionBar,
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
import { useLockedMonths } from './locked-months';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FREQ_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    bimonthly: 'Every 2 months',
    quarterly: 'Quarterly',
    trimester: 'Trimester',
    biannually: 'Biannually',
    annually: 'Annually',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtAmount(n: number) {
    return `$${n.toFixed(2)}`;
}

function fmtFreq(freq: string) {
    return FREQ_LABELS[freq] ?? freq;
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function defaultDayOfMonth() {
    return String(new Date().getDate());
}

function defaultDayOfWeek() {
    return String(new Date().getDay());
}

function usesDayOfWeek(freq: string) {
    return freq === 'weekly' || freq === 'biweekly';
}

function usesDayOfMonth(freq: string) {
    return !usesDayOfWeek(freq);
}

function currentVersion(s: RegularIncomeSchedule): RegularIncomeScheduleVersion | null {
    if (!s.versions?.length) return null;
    return s.versions.find((v) => v.active && !v.end_date) ?? s.versions[0] ?? null;
}

type VersionForm = {
    amount: string;
    start_date: string;
    frequency: string;
    day_of_month: string;
    day_of_week: string;
    anchor_date: string;
};

function blankVersionForm(): VersionForm {
    return {
        amount: '',
        start_date: todayStr(),
        frequency: 'monthly',
        day_of_month: defaultDayOfMonth(),
        day_of_week: defaultDayOfWeek(),
        anchor_date: todayStr(),
    };
}

function VersionScheduleFields({
    versionForm,
    setVersionForm,
    amountLabel = 'Amount',
    startDateLabel = 'Effective from',
}: {
    versionForm: VersionForm;
    setVersionForm: React.Dispatch<React.SetStateAction<VersionForm>>;
    amountLabel?: string;
    startDateLabel?: string;
}) {
    const freq = versionForm.frequency;

    return (
        <>
            <Field label={amountLabel}>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputCls}
                    value={versionForm.amount}
                    onChange={(e) => setVersionForm((f) => ({ ...f, amount: e.target.value }))}
                />
            </Field>
            <Field label="Frequency">
                <select
                    className={selectCls}
                    value={versionForm.frequency}
                    onChange={(e) => setVersionForm((f) => ({ ...f, frequency: e.target.value }))}
                >
                    {Object.entries(FREQ_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </Field>
            {usesDayOfWeek(freq) && (
                <Field label="Day of week">
                    <select
                        className={selectCls}
                        value={versionForm.day_of_week}
                        onChange={(e) => setVersionForm((f) => ({ ...f, day_of_week: e.target.value }))}
                    >
                        {DAY_NAMES.map((name, i) => (
                            <option key={i} value={i}>
                                {name}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {freq === 'biweekly' && (
                <Field label="Anchor date">
                    <input
                        type="date"
                        required
                        className={dateCls}
                        value={versionForm.anchor_date}
                        onChange={(e) => setVersionForm((f) => ({ ...f, anchor_date: e.target.value }))}
                    />
                </Field>
            )}
            {usesDayOfMonth(freq) && (
                <Field label="Day of month">
                    <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        className={inputCls}
                        value={versionForm.day_of_month}
                        onChange={(e) => setVersionForm((f) => ({ ...f, day_of_month: e.target.value }))}
                    />
                </Field>
            )}
            <Field label={startDateLabel}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={versionForm.start_date}
                    onChange={(e) => setVersionForm((f) => ({ ...f, start_date: e.target.value }))}
                />
            </Field>
        </>
    );
}

function VersionHistory({ versions }: { versions: RegularIncomeScheduleVersion[] }) {
    const [open, setOpen] = useState(false);
    if (!versions.length) return null;

    return (
        <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
                <span>Version History ({versions.length})</span>
                <span className="text-xs opacity-60">{open ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {open && (
                <div className="mt-2 space-y-1.5">
                    {versions.map((v) => {
                        const isCurrent = v.active && !v.end_date;
                        return (
                            <div
                                key={v.id}
                                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 text-sm ${
                                    isCurrent
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'bg-slate-50 opacity-70 dark:bg-neutral-800/40'
                                }`}
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-semibold text-slate-800 dark:text-neutral-100">
                                        {fmtAmount(v.amount)}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-neutral-400">{fmtFreq(v.frequency)}</span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-neutral-400">
                                    {fmtDate(v.start_date)}
                                    {v.end_date ? ` → ${fmtDate(v.end_date)}` : ' → now'}
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

function toggleMeta(s: RegularIncomeSchedule): {
    switchOn: boolean;
    badge: { label: string; color: 'amber' | 'teal' } | null;
} {
    if (s.pending_active !== null) {
        return {
            switchOn: s.pending_active,
            badge: s.pending_active
                ? { label: 'Resume pending', color: 'teal' }
                : { label: 'Pause pending', color: 'amber' },
        };
    }
    return { switchOn: s.active, badge: null };
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

function entryTypeChip(type: IncomeEntry['type']) {
    if (type === 'refund') return <StatusChip label="Refund" color="violet" />;
    if (type === 'regular') return <StatusChip label="Regular" color="green" />;
    return <StatusChip label="Irregular" color="slate" />;
}

// ---------------------------------------------------------------------------
// Sub-tab: Schedules
// ---------------------------------------------------------------------------

type ToggleAction = { schedule: RegularIncomeSchedule; isCancel: boolean };

function SchedulesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [schedules, setSchedules] = useState<RegularIncomeSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RegularIncomeSchedule | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<RegularIncomeSchedule | null>(null);
    const [toggleAction, setToggleAction] = useState<ToggleAction | null>(null);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blankSchedule = { name: '', description: '' };
    const [form, setForm] = useState(blankSchedule);
    const [versionForm, setVersionForm] = useState(blankVersionForm());
    const [showVersionUpdate, setShowVersionUpdate] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setSchedules(await apiFetchList<RegularIncomeSchedule>('/api/v1/income/schedules'));
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

    const selectRow = (s: RegularIncomeSchedule) => {
        setSelected(s);
        setForm({ name: s.name, description: s.description ?? '' });
        setShowVersionUpdate(false);
        setError(null);
        if (isMobile) setSheetOpen(true);
    };

    const reset = () => {
        setSelected(null);
        setForm(blankSchedule);
        setVersionForm(blankVersionForm());
        setShowVersionUpdate(false);
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm(blankSchedule);
                setVersionForm(blankVersionForm());
                setShowVersionUpdate(false);
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, []);

    const buildVersionPayload = (vf: VersionForm) => {
        const body: Record<string, unknown> = {
            amount: Number(vf.amount),
            frequency: vf.frequency,
            start_date: vf.start_date,
        };
        if (usesDayOfWeek(vf.frequency)) {
            body.day_of_week = Number(vf.day_of_week);
        }
        if (vf.frequency === 'biweekly') {
            body.anchor_date = vf.anchor_date;
        }
        if (usesDayOfMonth(vf.frequency)) {
            body.day_of_month = Number(vf.day_of_month);
        }
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                const body = { name: form.name, description: form.description || null };
                await apiFetch(`/api/v1/income/schedules/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                const body = {
                    name: form.name,
                    description: form.description || null,
                    ...buildVersionPayload(versionForm),
                };
                await apiFetch('/api/v1/income/schedules', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVersionUpdate = async (e: React.FormEvent) => {
        if (!selected) return;
        e.preventDefault();
        setSavingVersion(true);
        setError(null);
        try {
            await apiFetch(`/api/v1/income/schedules/${selected.id}/update-amount`, {
                method: 'POST',
                body: JSON.stringify(buildVersionPayload(versionForm)),
            });
            setShowVersionUpdate(false);
            setVersionForm(blankVersionForm());
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingVersion(false);
        }
    };

    const handleArchive = async (s: RegularIncomeSchedule) => {
        try {
            await apiFetch(`/api/v1/income/schedules/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setArchiveTarget(null);
    };

    const execToggle = async (s: RegularIncomeSchedule) => {
        setToggling(true);
        setToggleAction(null);
        try {
            const res = await apiFetch<{ data: RegularIncomeSchedule }>(`/api/v1/income/schedules/${s.id}/toggle`, {
                method: 'PATCH',
            });
            const updated: RegularIncomeSchedule = (res as any).data ?? res;
            setSchedules((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
            if (selected?.id === s.id) setSelected(updated);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setToggling(false);
        }
    };

    const requestToggle = (s: RegularIncomeSchedule, e: React.MouseEvent) => {
        e.stopPropagation();
        if (s.pending_active !== null) {
            execToggle(s);
        } else {
            setToggleAction({ schedule: s, isCancel: false });
        }
    };

    const version = selected ? currentVersion(selected) : null;
    const meta = selected ? toggleMeta(selected) : null;

    const formContent = (
        <div className="space-y-4">
            {selected && version && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-neutral-800/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-neutral-100">
                                {fmtAmount(version.amount)}
                                <span className="ml-1 text-sm font-normal text-slate-500 dark:text-neutral-400">
                                    / {fmtFreq(version.frequency)}
                                </span>
                            </p>
                            {version.day_of_month != null && usesDayOfMonth(version.frequency) && (
                                <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                    Day {version.day_of_month} of each period
                                </p>
                            )}
                            {version.day_of_week != null && usesDayOfWeek(version.frequency) && (
                                <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-500">
                                    Every {DAY_NAMES[version.day_of_week]}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="text-right">
                                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                                    {meta?.badge ? meta.badge.label : selected.active ? 'Active' : 'Paused'}
                                </p>
                            </div>
                            <ToggleSwitch
                                on={meta?.switchOn ?? false}
                                disabled={toggling}
                                onClick={(e) => selected && requestToggle(selected, e)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && <ApiError message={error} onDismiss={() => setError(null)} />}
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
                <Field label="Description (optional)">
                    <input
                        type="text"
                        maxLength={255}
                        className={inputCls}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                </Field>
                {!selected && (
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-700">
                        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-neutral-200">Initial schedule</p>
                        <VersionScheduleFields versionForm={versionForm} setVersionForm={setVersionForm} startDateLabel="Starts on" />
                    </div>
                )}
                <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
            </form>

            {selected && (
                <>
                    {selected.versions && <VersionHistory versions={selected.versions} />}
                    <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
                        {!showVersionUpdate ? (
                            <button
                                type="button"
                                className={secondaryBtnCls}
                                onClick={() => {
                                    const v = currentVersion(selected);
                                    setVersionForm({
                                        amount: v ? String(v.amount) : '',
                                        start_date: todayStr(),
                                        frequency: v?.frequency ?? 'monthly',
                                        day_of_month: v?.day_of_month != null ? String(v.day_of_month) : defaultDayOfMonth(),
                                        day_of_week: v?.day_of_week != null ? String(v.day_of_week) : defaultDayOfWeek(),
                                        anchor_date: v?.anchor_date ?? todayStr(),
                                    });
                                    setShowVersionUpdate(true);
                                }}
                            >
                                Update amount / schedule
                            </button>
                        ) : (
                            <form onSubmit={handleVersionUpdate} className="space-y-3">
                                <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">New version</p>
                                <VersionScheduleFields versionForm={versionForm} setVersionForm={setVersionForm} />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={savingVersion} className={secondaryBtnCls}>
                                        {savingVersion ? 'Saving…' : 'Save version'}
                                    </button>
                                    <button
                                        type="button"
                                        className={secondaryBtnCls}
                                        onClick={() => {
                                            setShowVersionUpdate(false);
                                            setVersionForm(blankVersionForm());
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                    <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
                        <button type="button" className={secondaryBtnCls} onClick={() => setArchiveTarget(selected)}>
                            Archive schedule
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            {toggleAction && (
                <ConfirmModal
                    message={
                        toggleAction.schedule.active
                            ? `Pause "${toggleAction.schedule.name}" after its next occurrence? Existing entries stay.`
                            : `Resume "${toggleAction.schedule.name}" after its next occurrence?`
                    }
                    onConfirm={() => execToggle(toggleAction.schedule)}
                    onCancel={() => setToggleAction(null)}
                />
            )}
            {archiveTarget && (
                <ConfirmModal
                    message={`Archive "${archiveTarget.name}"? Generated entries remain; no new occurrences will be created.`}
                    onConfirm={() => handleArchive(archiveTarget)}
                    onCancel={() => setArchiveTarget(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Schedule' : 'New Schedule'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !schedules.length && <EmptyRows label="No regular income schedules yet." />}
                        {schedules.map((s) => {
                            const v = currentVersion(s);
                            const m = toggleMeta(s);
                            return (
                                <ListRow key={s.id} selected={selected?.id === s.id} onClick={() => selectRow(s)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{s.name}</p>
                                            {v && (
                                                <p className={`mt-0.5 ${rowDetailCls}`}>
                                                    {fmtFreq(v.frequency)} · {fmtAmount(v.amount)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {m.badge && <StatusChip label={m.badge.label} color={m.badge.color} />}
                                            {!s.active && !m.badge && <StatusChip label="Paused" color="amber" />}
                                            <ToggleSwitch
                                                on={m.switchOn}
                                                size="sm"
                                                disabled={toggling}
                                                onClick={(e) => requestToggle(s, e)}
                                            />
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
// Sub-tab: Entries
// ---------------------------------------------------------------------------

function EntriesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const { isLocked } = useLockedMonths();
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<IncomeEntry | null>(null);
    const [confirm, setConfirm] = useState<IncomeEntry | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank: { type: 'regular' | 'irregular'; name: string; description: string; amount: string; received_at: string } = {
        type: 'irregular',
        name: '',
        description: '',
        amount: '',
        received_at: todayStr(),
    };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            setEntries(await apiFetchList<IncomeEntry>('/api/v1/income/entries'));
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

    const selectRow = (entry: IncomeEntry) => {
        if (entry.type === 'refund') return;
        setSelected(entry);
        setForm({
            type: entry.type === 'regular' ? 'regular' : 'irregular',
            name: entry.name,
            description: entry.description ?? '',
            amount: String(entry.amount),
            received_at: entry.received_at?.slice(0, 10) ?? todayStr(),
        });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };

    const reset = () => {
        setSelected(null);
        setForm(blank);
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm(blank);
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
            const body = {
                type: form.type,
                name: form.name,
                description: form.description || null,
                amount: Number(form.amount),
                received_at: form.received_at,
            };
            if (selected) {
                await apiFetch(`/api/v1/income/entries/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/income/entries', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry: IncomeEntry) => {
        try {
            await apiFetch(`/api/v1/income/entries/${entry.id}`, { method: 'DELETE' });
            if (selected?.id === entry.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            {!selected && (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                    Add one-off irregular income. Regular income is generated from schedules; refunds come from purchases.
                </p>
            )}
            {selected?.type === 'regular' && (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                    This entry was auto-generated from a schedule. You can adjust amount or date in the open month.
                </p>
            )}
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
            <Field label="Description (optional)">
                <input
                    type="text"
                    maxLength={255}
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>
            <Field label="Amount">
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputCls}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
            </Field>
            <Field label="Received on">
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.received_at}
                    onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete "${confirm.name}" (${fmtAmount(confirm.amount)})?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Entry' : 'New Irregular Entry'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !entries.length && <EmptyRows label="No income entries yet." />}
                        {entries.map((entry) => {
                            const monthLocked = isLocked(entry.received_at);
                            const canEdit = entry.type !== 'refund' && !monthLocked;
                            return (
                                <ListRow key={entry.id} selected={selected?.id === entry.id} onClick={() => canEdit && selectRow(entry)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className={rowTitleCls}>{entry.name}</p>
                                                {entryTypeChip(entry.type)}
                                            </div>
                                            {entry.description && (
                                                <p className={`mt-0.5 truncate ${rowDetailCls}`}>{entry.description}</p>
                                            )}
                                        </div>
                                        <span className={`${rowAmountCls} text-emerald-600 dark:text-emerald-400`}>
                                            {fmtAmount(entry.amount)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className={rowDetailCls}>{fmtDate(entry.received_at)}</span>
                                        {canEdit && (
                                            <RowActions onEdit={() => selectRow(entry)} onDelete={() => setConfirm(entry)} />
                                        )}
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
// Sub-tab: Archive
// ---------------------------------------------------------------------------

function ArchiveTab({ active }: { active: boolean }) {
    const [schedules, setSchedules] = useState<RegularIncomeSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [hardDeleting, setHardDeleting] = useState<number | null>(null);
    const [hardDeleteTarget, setHardDeleteTarget] = useState<RegularIncomeSchedule | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setSchedules(await apiFetchList<RegularIncomeSchedule>('/api/v1/income/schedules?archived=1'));
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

    const handleRestore = async (s: RegularIncomeSchedule) => {
        setRestoring(s.id);
        try {
            await apiFetch(`/api/v1/income/schedules/${s.id}/restore`, { method: 'PATCH' });
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRestoring(null);
        }
    };

    const handleHardDelete = async (s: RegularIncomeSchedule) => {
        setHardDeleting(s.id);
        setHardDeleteTarget(null);
        try {
            await apiFetch(`/api/v1/income/schedules/${s.id}/force`, { method: 'DELETE' });
            setFetched(false);
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
                    {!loading && !schedules.length && <EmptyRows label="No archived schedules." />}
                    {schedules.map((s) => {
                        const v = currentVersion(s);
                        const isRestoring = restoring === s.id;
                        const isDeleting = hardDeleting === s.id;
                        return (
                            <ListRow key={s.id} disabled>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className={`${rowTitleCls} line-through opacity-60`}>{s.name}</p>
                                        <p className={`mt-0.5 truncate ${rowDetailCls} opacity-60`}>
                                            {v ? `${fmtFreq(v.frequency)} · ${fmtAmount(v.amount)}` : 'No version'}
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
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Schedules', 'Entries', 'Archive'] as const;
type SubTab = (typeof SUBTABS)[number];

export function IncomeTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Schedules');
    const addRef = useRef<(() => void) | null>(null);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                {sub !== 'Archive' && <AddButton onClick={() => addRef.current?.()} />}
            </TabToolbar>
            {sub === 'Schedules' && <SchedulesTab addRef={addRef} active={active} />}
            {sub === 'Entries' && <EntriesTab addRef={addRef} active={active} />}
            {sub === 'Archive' && <ArchiveTab active={active} />}
        </div>
    );
}
