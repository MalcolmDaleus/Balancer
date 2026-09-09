import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { toastError } from '@/lib/toast';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IncomeEntry } from '@/types/api';
import { MutableRefObject, useEffect, useMemo, useState } from 'react';
import { blankFactFilter, FactFilterBar, matchesFactFilter, monthRangeContaining, type FactFilterValues } from '../fact-filters';
import type { LedgerFocus } from '../ledger-focus';
import { useLockedMonths } from '../locked-months';
import { fmtDate } from '../schedule-primitives';
import {
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    dateCls,
    inputCls,
    ListRow,
    ListStack,
    LoadingRows,
    RowActions,
    SplitPane,
    StatusChip,
    dropById,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    todayStr,
} from '../shared';

function entryTypeChip(type: IncomeEntry['type']) {
    if (type === 'refund') return <StatusChip label="Refund" color="violet" />;
    if (type === 'regular') return <StatusChip label="Regular" color="green" />;
    return <StatusChip label="Irregular" color="slate" />;
}

export function IncomeEntriesPanel({
    active,
    addRef,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    addRef?: MutableRefObject<(() => void) | null>;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<IncomeEntry | null>(null);
    const [confirm, setConfirm] = useState<IncomeEntry | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
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
    const [filter, setFilter] = useState<FactFilterValues>(blankFactFilter);

    const formWritable = canMutateFact(form.received_at);

    const load = async () => {
        setLoading(true);
        try {
            setEntries(await apiFetchList<IncomeEntry>('/api/v1/income/entries'));
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

    const visibleEntries = useMemo(
        () =>
            entries.filter((entry) =>
                matchesFactFilter(
                    {
                        date: entry.received_at,
                        amountCents: entry.amount_cents,
                        text: `${entry.name} ${entry.description ?? ''}`,
                    },
                    filter,
                ),
            ),
        [entries, filter],
    );

    const selectRow = (entry: IncomeEntry) => {
        setSelected(entry);
        if (entry.type !== 'refund') {
            setForm({
                type: entry.type === 'regular' ? 'regular' : 'irregular',
                name: entry.name,
                description: entry.description ?? '',
                amount: centsToInput(entry.amount_cents),
                received_at: entry.received_at?.slice(0, 10) ?? todayStr(),
            });
        }
        setError(null);
        if (isMobile && entry.type !== 'refund' && canMutateFact(entry.received_at)) {
            setSheetOpen(true);
        }
    };

    useEffect(() => {
        if (!focus || focus.domain !== 'income') return;
        setFilter((f) => ({ ...f, ...monthRangeContaining(focus.occurredOn) }));
    }, [focus]);

    useEffect(() => {
        if (!focus || focus.domain !== 'income' || !fetched) return;
        const entry = entries.find((row) => row.id === focus.sourceId);
        if (!entry) return;
        selectRow(entry);
        onFocusConsumed?.();
    }, [focus, fetched, entries]);

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
    }, [addRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canMutateFact(form.received_at)) {
            const msg = loaded ? 'This month is locked.' : 'Checking month locks…';
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = {
                type: form.type,
                name: form.name,
                description: form.description || null,
                amount_cents: majorInputToCents(form.amount),
                received_at: form.received_at,
            };
            if (selected) {
                await apiFetch(`/api/v1/income/entries/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: 'Saved',
                });
            } else {
                await apiFetch('/api/v1/income/entries', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: 'Income added',
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

    const handleDelete = async (entry: IncomeEntry) => {
        setConfirm(null);
        setRemovingId(entry.id);
        try {
            await apiFetch(`/api/v1/income/entries/${entry.id}`, { method: 'DELETE', toast: 'Deleted' });
            setEntries(dropById(entry.id));
            if (selected?.id === entry.id) reset();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
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
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!formWritable || selected?.type === 'refund'} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete "${confirm.name}" (${fmtAmount(confirm.amount_cents)})?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <FactFilterBar value={filter} onChange={setFilter} />
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Entry' : 'New Irregular Entry'}
                list={
                    <ListStack>
                        {loading && !entries.length && <LoadingRows />}
                        {!loading && !entries.length && <EmptyRows label="No income entries yet." />}
                        {!loading && entries.length > 0 && !visibleEntries.length && (
                            <EmptyRows label="No entries match these filters." />
                        )}
                        {visibleEntries.map((entry) => {
                            const canEdit = entry.type !== 'refund' && canMutateFact(entry.received_at);
                            return (
                                <ListRow key={entry.id} selected={selected?.id === entry.id} busy={removingId === entry.id}>
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
                                            {fmtAmount(entry.amount_cents)}
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
