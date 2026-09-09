import { apiFetch, apiFetchList, errorMessage, isNotFound, unwrapData } from '@/api/client';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RegularIncomeSchedule, RegularIncomeScheduleVersion } from '@/types/api';
import { MutableRefObject, useEffect, useState } from 'react';
import {
    blankIncomeVersionForm,
    DAY_NAMES,
    defaultDayOfMonth,
    defaultDayOfWeek,
    fmtDate,
    fmtIncomeFreq,
    IncomeVersionScheduleFields,
    ScheduleHistory,
    ToggleSwitch,
    usesDayOfMonth,
    usesDayOfWeek,
    type IncomeVersionForm,
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
    rowDetailCls,
    rowTitleCls,
    secondaryBtnCls,
    todayStr,
} from '../shared';

function currentVersion(s: RegularIncomeSchedule): RegularIncomeScheduleVersion | null {
    if (!s.versions?.length) return null;
    return s.versions.find((v) => v.active && !v.end_date) ?? s.versions[0] ?? null;
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

type ToggleAction = { schedule: RegularIncomeSchedule; isCancel: boolean };

export function IncomeSchedulesPanel({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const [schedules, setSchedules] = useState<RegularIncomeSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RegularIncomeSchedule | null>(null);
    const [removeTarget, setRemoveTarget] = useState<RegularIncomeSchedule | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [toggleAction, setToggleAction] = useState<ToggleAction | null>(null);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blankSchedule = { name: '', description: '' };
    const [form, setForm] = useState(blankSchedule);
    const [versionForm, setVersionForm] = useState(() => blankIncomeVersionForm(todayStr()));
    const [showVersionUpdate, setShowVersionUpdate] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setSchedules(await apiFetchList<RegularIncomeSchedule>('/api/v1/income/schedules'));
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
        setVersionForm(blankIncomeVersionForm(todayStr()));
        setShowVersionUpdate(false);
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm(blankSchedule);
                setVersionForm(blankIncomeVersionForm(todayStr()));
                setShowVersionUpdate(false);
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, [addRef]);

    const buildVersionPayload = (vf: IncomeVersionForm) => {
        const body: Record<string, unknown> = {
            amount_cents: majorInputToCents(vf.amount),
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
                await apiFetch(`/api/v1/income/schedules/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: 'Saved',
                });
            } else {
                const body = {
                    name: form.name,
                    description: form.description || null,
                    ...buildVersionPayload(versionForm),
                };
                await apiFetch('/api/v1/income/schedules', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: 'Schedule added',
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

    const handleVersionUpdate = async (e: React.FormEvent) => {
        if (!selected) return;
        e.preventDefault();
        setSavingVersion(true);
        setError(null);
        try {
            await apiFetch(`/api/v1/income/schedules/${selected.id}/update-amount`, {
                method: 'POST',
                body: JSON.stringify(buildVersionPayload(versionForm)),
                toast: 'Amount updated',
            });
            setShowVersionUpdate(false);
            setVersionForm(blankIncomeVersionForm(todayStr()));
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSavingVersion(false);
        }
    };

    const handleRemove = async (s: RegularIncomeSchedule) => {
        const hard = Boolean(s.can_hard_delete);
        setRemoveTarget(null);
        setRemovingId(s.id);
        try {
            await apiFetch(hard ? `/api/v1/income/schedules/${s.id}/force` : `/api/v1/income/schedules/${s.id}`, {
                method: 'DELETE',
                toast: hard ? 'Deleted' : 'Archived',
            });
            setSchedules(dropById(s.id));
            if (selected?.id === s.id) reset();
        } catch (err: unknown) {
            if (isNotFound(err)) {
                setSchedules(dropById(s.id));
                if (selected?.id === s.id) reset();
                return;
            }
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const execToggle = async (s: RegularIncomeSchedule) => {
        setToggling(true);
        setToggleAction(null);
        try {
            const res = await apiFetch<RegularIncomeSchedule | { data: RegularIncomeSchedule }>(
                `/api/v1/income/schedules/${s.id}/toggle`,
                { method: 'PATCH', toast: 'Updated' },
            );
            const updated = unwrapData(res);
            setSchedules((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
            if (selected?.id === s.id) setSelected(updated);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setToggling(false);
        }
    };

    const requestToggle = (s: RegularIncomeSchedule, e: React.MouseEvent) => {
        e.stopPropagation();
        if (s.pending_active !== null) {
            void execToggle(s);
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
                                {fmtAmount(version.amount_cents)}
                                <span className="ml-1 text-sm font-normal text-slate-500 dark:text-neutral-400">
                                    / {fmtIncomeFreq(version.frequency)}
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
                                label={selected.active ? 'Pause schedule' : 'Resume schedule'}
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
                    <div data-cs-form-span className="rounded-xl border border-slate-200 p-3 dark:border-neutral-700">
                        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-neutral-200">Initial schedule</p>
                        <IncomeVersionScheduleFields versionForm={versionForm} setVersionForm={setVersionForm} startDateLabel="Starts on" />
                    </div>
                )}
                <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
            </form>

            {selected && (
                <>
                    {selected.versions && (
                        <ScheduleHistory title="Version History" rows={selected.versions} formatFreq={fmtIncomeFreq} />
                    )}
                    <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
                        {!showVersionUpdate ? (
                            <button
                                type="button"
                                className={secondaryBtnCls}
                                onClick={() => {
                                    const v = currentVersion(selected);
                                    setVersionForm({
                                        amount: v ? centsToInput(v.amount_cents) : '',
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
                                <IncomeVersionScheduleFields versionForm={versionForm} setVersionForm={setVersionForm} />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={savingVersion} className={secondaryBtnCls}>
                                        {savingVersion ? 'Saving…' : 'Save version'}
                                    </button>
                                    <button
                                        type="button"
                                        className={secondaryBtnCls}
                                        onClick={() => {
                                            setShowVersionUpdate(false);
                                            setVersionForm(blankIncomeVersionForm(todayStr()));
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
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
            {removeTarget && (
                <ConfirmModal
                    {...instrumentRemoveConfirm(
                        removeTarget.name,
                        removeTarget.can_hard_delete,
                        `Archive "${removeTarget.name}"? Generated entries remain; no new occurrences will be created.`,
                    )}
                    onConfirm={() => handleRemove(removeTarget)}
                    onCancel={() => setRemoveTarget(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Schedule' : 'New Schedule'}
                list={
                    <ListStack>
                        {loading && !schedules.length && <LoadingRows />}
                        {!loading && !schedules.length && <EmptyRows label="No regular income schedules yet." />}
                        {schedules.map((s) => {
                            const v = currentVersion(s);
                            const m = toggleMeta(s);
                            const busy = removingId === s.id;
                            return (
                                <ListRow key={s.id} selected={selected?.id === s.id} busy={busy}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{s.name}</p>
                                            {v && (
                                                <p className={`mt-0.5 ${rowDetailCls}`}>
                                                    {fmtIncomeFreq(v.frequency)} · {fmtAmount(v.amount_cents)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            <div className="flex items-center gap-1.5">
                                                {m.badge && <StatusChip label={m.badge.label} color={m.badge.color} />}
                                                {!s.active && !m.badge && <StatusChip label="Paused" color="amber" />}
                                                <ToggleSwitch
                                                    on={m.switchOn}
                                                    size="sm"
                                                    disabled={toggling || busy}
                                                    label={s.active ? 'Pause schedule' : 'Resume schedule'}
                                                    onClick={(e) => requestToggle(s, e)}
                                                />
                                            </div>
                                            <RowActions
                                                onEdit={() => selectRow(s)}
                                                onDelete={() => setRemoveTarget(s)}
                                                editDisabled={busy}
                                                deleteDisabled={busy}
                                                {...instrumentDanger(s.can_hard_delete)}
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

// Re-export helpers used by archive panel
export { currentVersion, fmtDate, fmtIncomeFreq };
