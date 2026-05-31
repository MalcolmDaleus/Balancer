import { useEffect, useState } from 'react';
import {
    ApiError, ConfirmModal, EmptyRows, Field,
    FormActions, LoadingRows, Saving, SplitPane, StatusChip,
    apiFetch, apiFetchList, dateCls, inputCls, selectCls, thisMonthStr, useIsMobile,
} from './shared';

export function SavingsTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [savings, setSavings]   = useState<Saving[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<Saving | null>(null);
    const [confirm, setConfirm]   = useState<Saving | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { amount: '', type: 'deposit' as 'deposit' | 'withdrawal', notes: '', month: thisMonthStr() };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try { setSavings(await apiFetchList<Saving>('/api/v1/savings')); setFetched(true); }
        catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (s: Saving) => {
        setSelected(s);
        setForm({ amount: String(s.amount), type: s.type, notes: s.notes ?? '', month: s.month?.slice(0, 7) ?? thisMonthStr() });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); setSheetOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = { amount: Number(form.amount), type: form.type, notes: form.notes || null, month: form.month };
            if (selected) {
                await apiFetch(`/api/v1/savings/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/savings', { method: 'POST', body: JSON.stringify(body) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (s: Saving) => {
        try {
            await apiFetch(`/api/v1/savings/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const grandTotal = savings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Type">
                <select className={selectCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'deposit' | 'withdrawal' }))}>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                </select>
            </Field>
            <Field label="Amount">
                <input type="number" step="0.01" min="0.01" required className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Month (YYYY-MM)">
                <input type="month" required className={inputCls} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
            </Field>
            <Field label="Notes (optional)">
                <input type="text" maxLength={500} className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Delete this ${confirm.type} of $${confirm.amount}?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                {!loading && savings.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/40">
                        <span className="text-slate-500 dark:text-slate-400">Total savings</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">${grandTotal.toFixed(2)}</span>
                    </div>
                )}
                <SplitPane
                    sheetOpen={sheetOpen}
                    onSheetOpenChange={setSheetOpen}
                    sheetTitle={selected ? 'Edit Transaction' : 'New Transaction'}
                    onAddClick={() => { reset(); setSheetOpen(true); }}
                    list={
                        <div className="space-y-1">
                            {loading && <LoadingRows />}
                            {!loading && !savings.length && <EmptyRows label="No savings transactions yet." />}
                            {savings.map(s => (
                                <div key={s.id} onClick={() => selectRow(s)}
                                    className={`flex cursor-pointer items-start justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${selected?.id === s.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                    {/* Left: notes on top, chip + date below */}
                                    <div className="min-w-0 flex-1">
                                        {s.notes
                                            ? <p className="truncate font-medium text-slate-800 dark:text-slate-100">{s.notes}</p>
                                            : <p className="font-medium italic text-slate-400 dark:text-slate-500">No notes</p>
                                        }
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            <StatusChip label={s.type === 'deposit' ? 'Deposit' : 'Withdrawal'} color={s.type === 'deposit' ? 'green' : 'red'} />
                                            <span className="text-slate-400">{s.month?.slice(0, 7)}</span>
                                        </div>
                                    </div>
                                    {/* Right: amount + actions inline */}
                                    <div className="ml-2 flex shrink-0 items-center gap-2">
                                        <span className={`font-semibold ${s.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                            {s.type === 'deposit' ? '+' : '-'}${s.amount.toFixed(2)}
                                        </span>
                                        <div className="flex gap-1">
                                            <button onClick={e => { e.stopPropagation(); selectRow(s); }}
                                                className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-100 dark:bg-sky-700 dark:text-sky-50 dark:hover:bg-sky-600">
                                                Edit
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); setConfirm(s); }}
                                                className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-500 hover:bg-rose-100 dark:bg-rose-700 dark:text-rose-50 dark:hover:bg-rose-600">
                                                Del
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    }
                    form={formContent}
                />
            </div>
        </>
    );
}
