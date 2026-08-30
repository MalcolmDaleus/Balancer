import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { toastError } from '@/lib/toast';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Saving } from '@/types/api';
import { useEffect, useState } from 'react';
import { useLockedMonths } from './locked-months';
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
    RowActions,
    SplitPane,
    StatusChip,
    dropById,
    TabToolbar,
    inputCls,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    selectCls,
    thisMonthStr,
} from './shared';

export function SavingsTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [savings, setSavings] = useState<Saving[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<Saving | null>(null);
    const [confirm, setConfirm] = useState<Saving | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { amount: '', type: 'deposit' as 'deposit' | 'withdrawal', notes: '', month: thisMonthStr() };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            setSavings(await apiFetchList<Saving>('/api/v1/savings'));
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

    const selectRow = (s: Saving) => {
        if (!canMutateFact(s.month)) return;
        setSelected(s);
        setForm({ amount: String(s.amount), type: s.type, notes: s.notes ?? '', month: s.month?.slice(0, 7) ?? thisMonthStr() });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => {
        setSelected(null);
        setForm(blank);
        setError(null);
        setSheetOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canMutateFact(form.month)) {
            const msg = loaded ? 'This month is locked.' : 'Checking month locks…';
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = { amount: Number(form.amount), type: form.type, notes: form.notes || null, month: form.month };
            if (selected) {
                await apiFetch(`/api/v1/savings/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: 'Saved',
                });
            } else {
                await apiFetch('/api/v1/savings', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: form.type === 'withdrawal' ? 'Withdrawal added' : 'Deposit added',
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

    const handleDelete = async (s: Saving) => {
        setConfirm(null);
        setRemovingId(s.id);
        try {
            await apiFetch(`/api/v1/savings/${s.id}`, { method: 'DELETE', toast: 'Deleted' });
            setSavings(dropById(s.id));
            if (selected?.id === s.id) reset();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const grandTotal = savings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Type">
                <select
                    className={selectCls}
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'deposit' | 'withdrawal' }))}
                >
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                </select>
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
            <Field label="Month (YYYY-MM)">
                <input
                    type="month"
                    required
                    className={inputCls}
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                />
            </Field>
            <Field label="Notes (optional)">
                <input
                    type="text"
                    maxLength={500}
                    className={inputCls}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!canMutateFact(form.month)} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete this ${confirm.type} of ${fmtAmount(confirm.amount)}?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <div className="flex min-h-0 flex-1 flex-col">
                <TabToolbar>
                    {!loading && savings.length > 0 ? (
                        <span className={rowDetailCls}>
                            Total: <span className="font-semibold text-slate-800 dark:text-neutral-100">{fmtAmount(grandTotal)}</span>
                        </span>
                    ) : (
                        <span />
                    )}
                    <AddButton
                        onClick={() => {
                            setSelected(null);
                            setForm(blank);
                            setError(null);
                            setSheetOpen(true);
                        }}
                    />
                </TabToolbar>
                <SplitPane
                    sheetOpen={sheetOpen}
                    onSheetOpenChange={setSheetOpen}
                    sheetTitle={selected ? 'Edit Transaction' : 'New Transaction'}
                    list={
                        <ListStack>
                            {loading && !savings.length && <LoadingRows />}
                            {!loading && !savings.length && <EmptyRows label="No savings transactions yet." />}
                            {savings.map((s) => {
                                const canWrite = canMutateFact(s.month);
                                return (
                                    <ListRow key={s.id} selected={selected?.id === s.id} busy={removingId === s.id}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                {s.notes ? (
                                                    <p className={rowTitleCls}>{s.notes}</p>
                                                ) : (
                                                    <p className={`${rowTitleCls} italic text-slate-400 dark:text-neutral-400`}>No notes</p>
                                                )}
                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                    <StatusChip
                                                        label={s.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                                        color={s.type === 'deposit' ? 'green' : 'red'}
                                                    />
                                                    <span className={rowDetailCls}>{s.month?.slice(0, 7)}</span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-stretch gap-1">
                                                <span
                                                    className={`${rowAmountCls} text-right ${s.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                                                >
                                                    {s.type === 'deposit' ? '+' : '-'}
                                                    {fmtAmount(s.amount)}
                                                </span>
                                                {canWrite && (
                                                    <RowActions onEdit={() => selectRow(s)} onDelete={() => setConfirm(s)} />
                                                )}
                                            </div>
                                        </div>
                                    </ListRow>
                                );
                            })}
                        </ListStack>
                    }
                    form={formContent}
                />
            </div>
        </>
    );
}
