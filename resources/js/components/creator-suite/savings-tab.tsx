import { useEffect, useState } from 'react';
import {
    ApiError, ConfirmModal, EmptyRows, Field,
    FormActions, LoadingRows, Saving, StatusChip,
    apiFetch, apiFetchList, inputCls, selectCls, thisMonthStr,
} from './shared';

export function SavingsTab({ active }: { active: boolean }) {
    const [savings, setSavings]   = useState<Saving[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<Saving | null>(null);
    const [confirm, setConfirm]   = useState<Saving | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);

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
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); };

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

    // Grand total (net)
    const grandTotal = savings.reduce((acc, s) => acc + (s.type === 'deposit' ? s.amount : -s.amount), 0);

    return (
        <>
            {confirm && <ConfirmModal message={`Delete this ${confirm.type} of $${confirm.amount}?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                {/* Grand total banner */}
                {!loading && savings.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/40">
                        <span className="text-slate-500 dark:text-slate-400">Total savings</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100">${grandTotal.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
                    {/* List */}
                    <div className="min-h-0 md:w-[60%]">
                        <div className="min-h-0 overflow-y-auto pr-1">
                            {loading && <LoadingRows />}
                            {!loading && !savings.length && <EmptyRows label="No savings transactions yet." />}
                            <div className="space-y-1">
                                {savings.map(s => (
                                    <div key={s.id} onClick={() => selectRow(s)}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${selected?.id === s.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <StatusChip label={s.type === 'deposit' ? 'Deposit' : 'Withdrawal'} color={s.type === 'deposit' ? 'green' : 'red'} />
                                                {s.notes && <span className="max-w-[10rem] truncate text-slate-400">{s.notes}</span>}
                                            </div>
                                            <p className="mt-0.5 text-slate-400">{s.month?.slice(0, 7)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-semibold ${s.type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                {s.type === 'deposit' ? '+' : '-'}${s.amount.toFixed(2)}
                                            </span>
                                            <div className="flex gap-1">
                                                <button onClick={e => { e.stopPropagation(); selectRow(s); }}
                                                    className="rounded px-2 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30">
                                                    Edit
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); setConfirm(s); }}
                                                    className="rounded px-2 py-0.5 text-[10px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                                                    Del
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="border-t border-slate-100 pt-3 md:w-[40%] md:border-t-0 md:border-l md:pl-4 md:pt-0 dark:border-slate-700">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {selected ? 'Edit Transaction' : 'New Transaction'}
                            </p>
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
                    </div>
                </div>
            </div>
        </>
    );
}
