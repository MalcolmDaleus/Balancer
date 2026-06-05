import { useEffect, useState } from 'react';
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
    Saving,
    SplitPane,
    StatusChip,
    TabToolbar,
    apiFetch,
    apiFetchList,
    inputCls,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    selectCls,
    thisMonthStr,
    useIsMobile,
} from './shared';

export function SavingsTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [savings, setSavings] = useState<Saving[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<Saving | null>(null);
    const [confirm, setConfirm] = useState<Saving | null>(null);
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) load();
    }, [active, fetched]);

    const selectRow = (s: Saving) => {
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
        setSaving(true);
        setError(null);
        try {
            const body = { amount: Number(form.amount), type: form.type, notes: form.notes || null, month: form.month };
            if (selected) {
                await apiFetch(`/api/v1/savings/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/savings', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (s: Saving) => {
        try {
            await apiFetch(`/api/v1/savings/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
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
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete this ${confirm.type} of $${confirm.amount}?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <div className="flex min-h-0 flex-1 flex-col">
                <TabToolbar>
                    {!loading && savings.length > 0 ? (
                        <span className={rowDetailCls}>
                            Total: <span className="font-semibold text-slate-800 dark:text-slate-100">${grandTotal.toFixed(2)}</span>
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
                            {loading && <LoadingRows />}
                            {!loading && !savings.length && <EmptyRows label="No savings transactions yet." />}
                            {savings.map((s) => (
                                <ListRow key={s.id} selected={selected?.id === s.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {s.notes ? (
                                                <p className={rowTitleCls}>{s.notes}</p>
                                            ) : (
                                                <p className={`${rowTitleCls} italic text-slate-400 dark:text-slate-500`}>No notes</p>
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
                                                {s.type === 'deposit' ? '+' : '-'}${s.amount.toFixed(2)}
                                            </span>
                                            <RowActions onEdit={() => selectRow(s)} onDelete={() => setConfirm(s)} />
                                        </div>
                                    </div>
                                </ListRow>
                            ))}
                        </ListStack>
                    }
                    form={formContent}
                />
            </div>
        </>
    );
}
