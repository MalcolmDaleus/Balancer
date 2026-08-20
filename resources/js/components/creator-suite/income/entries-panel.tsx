import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { IncomeEntry } from '@/types/api';
import { MutableRefObject, useEffect, useState } from 'react';
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

export function IncomeEntriesPanel({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
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

    const selectRow = (entry: IncomeEntry) => {
        if (entry.type === 'refund') return;
        if (!canMutateFact(entry.received_at)) return;
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
    }, [addRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canMutateFact(form.received_at)) {
            setError(loaded ? 'This month is locked.' : 'Checking month locks…');
            return;
        }
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
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry: IncomeEntry) => {
        try {
            await apiFetch(`/api/v1/income/entries/${entry.id}`, { method: 'DELETE' });
            if (selected?.id === entry.id) reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
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
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!formWritable} />
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
                            const canEdit = entry.type !== 'refund' && canMutateFact(entry.received_at);
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
