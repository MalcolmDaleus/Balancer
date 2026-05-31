import { useEffect, useState } from 'react';
import {
    ApiError, ConfirmModal, Debt, DebtCategory, DebtPayment,
    EmptyRows, Field, FormActions, LoadingRows,
    RowActions, SplitPane, StatusChip, SubTabBar,
    apiFetch, apiFetchList, dateCls, inputCls, selectCls, todayStr, useIsMobile,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-tab: Debts
// ---------------------------------------------------------------------------

function DebtsTab_({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [debts, setDebts]       = useState<Debt[]>([]);
    const [cats, setCats]         = useState<DebtCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<Debt | null>(null);
    const [confirm, setConfirm]   = useState<Debt | null>(null);
    const [forgiving, setForgiving] = useState<Debt | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { description: '', category_id: '', amount: '', issue_date: todayStr(), notes: '' };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [d, c] = await Promise.all([
                apiFetchList<Debt>('/api/v1/debts'),
                apiFetchList<DebtCategory>('/api/v1/categories/debts'),
            ]);
            setDebts(d); setCats(c); setFetched(true);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (d: Debt) => {
        setSelected(d);
        setForm({ description: d.description, category_id: String(d.category_id ?? ''), amount: String(d.amount), issue_date: d.issue_date, notes: d.notes ?? '' });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); setSheetOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = {
                description: form.description,
                category_id: form.category_id ? Number(form.category_id) : null,
                amount: Number(form.amount),
                issue_date: form.issue_date,
                notes: form.notes || null,
            };
            if (selected) {
                await apiFetch(`/api/v1/debts/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/debts', { method: 'POST', body: JSON.stringify(body) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (d: Debt) => {
        try {
            await apiFetch(`/api/v1/debts/${d.id}`, { method: 'DELETE' });
            if (selected?.id === d.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const handleForgive = async (d: Debt) => {
        try {
            await apiFetch(`/api/v1/debts/${d.id}/forgive`, { method: 'POST' });
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setForgiving(null);
    };

    const statusChip = (d: Debt) => {
        if (d.is_forgiven) return <StatusChip label="Forgiven" color="amber" />;
        if (d.is_settled)  return <StatusChip label="Settled"  color="blue" />;
        return <StatusChip label="Open" color="green" />;
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Description">
                <input type="text" required maxLength={255} className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Category (optional)">
                <select className={selectCls} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— none —</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                </select>
            </Field>
            <Field label="Total Amount">
                <input type="number" step="0.01" min="0.01" required className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
            <Field label="Issue Date">
                <input type="date" required className={dateCls} value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </Field>
            <Field label="Notes (optional)">
                <textarea rows={2} maxLength={1000} className={`${inputCls} h-auto resize-none`} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm   && <ConfirmModal message={`Delete debt "${confirm.description}"?`}   onConfirm={() => handleDelete(confirm)}  onCancel={() => setConfirm(null)} />}
            {forgiving && <ConfirmModal message={`Mark "${forgiving.description}" as forgiven? Remaining balance will be written off.`} onConfirm={() => handleForgive(forgiving)} onCancel={() => setForgiving(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Debt' : 'New Debt'}
                onAddClick={() => { reset(); setSheetOpen(true); }}
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !debts.length && <EmptyRows label="No debts yet." />}
                        {debts.map(d => {
                            const closed = d.is_settled || d.is_forgiven || d.is_closed;
                            return (
                                <div key={d.id} onClick={() => !closed && selectRow(d)}
                                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${closed ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === d.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{d.description}</p>
                                        <p className="text-slate-400">Balance: ${d.remaining_balance.toFixed(2)} / ${d.amount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 pl-2">
                                        {statusChip(d)}
                                        {!closed && (
                                            <RowActions
                                                onEdit={() => selectRow(d)}
                                                onDelete={() => setConfirm(d)}
                                                extra={
                                                    <button onClick={e => { e.stopPropagation(); setForgiving(d); }}
                                                        className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-600 hover:bg-amber-100 dark:bg-amber-600 dark:text-amber-50 dark:hover:bg-amber-500">
                                                        Forgive
                                                    </button>
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }
                form={formContent}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Payments
// ---------------------------------------------------------------------------

function PaymentsTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [debts, setDebts]       = useState<Debt[]>([]);
    const [payments, setPayments] = useState<DebtPayment[]>([]);
    const [debtId, setDebtId]     = useState<number | null>(null);
    const [loading, setLoading]   = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<DebtPayment | null>(null);
    const [confirm, setConfirm]   = useState<DebtPayment | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { amount: '', paid_at: todayStr(), notes: '' };
    const [form, setForm] = useState(blank);

    useEffect(() => {
        if (!active || fetched) return;
        setLoading(true);
        apiFetchList<Debt>('/api/v1/debts').then(d => { setDebts(d); setFetched(true); }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, [active, fetched]);

    useEffect(() => {
        if (!debtId) { setPayments([]); return; }
        setPayLoading(true);
        apiFetchList<DebtPayment>(`/api/v1/debts/${debtId}/payments`).then(p => { setPayments(p); }).catch(e => setError(e.message)).finally(() => setPayLoading(false));
    }, [debtId]);

    const reloadPayments = () => {
        if (!debtId) return;
        setPayLoading(true);
        apiFetchList<DebtPayment>(`/api/v1/debts/${debtId}/payments`).then(p => setPayments(p)).catch(e => setError(e.message)).finally(() => setPayLoading(false));
    };

    const selectRow = (p: DebtPayment) => {
        setSelected(p);
        setForm({ amount: String(p.amount), paid_at: p.paid_at, notes: p.notes ?? '' });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); setSheetOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        if (!debtId) return;
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = { amount: Number(form.amount), paid_at: form.paid_at, notes: form.notes || null };
            if (selected) {
                await apiFetch(`/api/v1/debt-payments/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch(`/api/v1/debts/${debtId}/payments`, { method: 'POST', body: JSON.stringify(body) });
            }
            reset(); reloadPayments();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (p: DebtPayment) => {
        try {
            await apiFetch(`/api/v1/debt-payments/${p.id}`, { method: 'DELETE' });
            if (selected?.id === p.id) reset();
            reloadPayments();
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const selectedDebt = debts.find(d => d.id === debtId);
    const closed = selectedDebt ? (selectedDebt.is_settled || selectedDebt.is_forgiven || selectedDebt.is_closed) : false;

    const paymentForm = closed ? (
        <p className="text-xs text-slate-400">This debt is {selectedDebt?.is_forgiven ? 'forgiven' : 'settled'} — no new payments.</p>
    ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Amount">
                <input type="number" step="0.01" min="0.01" required className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
                    <Field label="Paid At">
                        <input type="date" required className={dateCls} value={form.paid_at} onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))} />
            </Field>
            <Field label="Notes (optional)">
                <input type="text" maxLength={1000} className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Delete payment of $${confirm.amount}?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Debt</label>
                    {loading ? <LoadingRows /> : (
                        <select className={selectCls} value={debtId ?? ''} onChange={e => { setDebtId(e.target.value ? Number(e.target.value) : null); reset(); }}>
                            <option value="">— select a debt —</option>
                            {debts.map(d => <option key={d.id} value={d.id}>{d.description} (${d.remaining_balance.toFixed(2)} left)</option>)}
                        </select>
                    )}
                </div>
                {debtId && (
                    <SplitPane
                        sheetOpen={sheetOpen}
                        onSheetOpenChange={setSheetOpen}
                        sheetTitle={selected ? 'Edit Payment' : 'New Payment'}
                        onAddClick={closed ? undefined : () => { reset(); setSheetOpen(true); }}
                        list={
                            <div className="space-y-1">
                                {payLoading && <LoadingRows />}
                                {!payLoading && !payments.length && <EmptyRows label="No payments for this debt." />}
                                {payments.map(p => (
                                    <div key={p.id} onClick={() => !closed && selectRow(p)}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${closed ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === p.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-100">${p.amount.toFixed(2)}</p>
                                            <p className="text-slate-400">{p.paid_at}{p.notes ? ` · ${p.notes}` : ''}</p>
                                        </div>
                                        {!closed && <RowActions onEdit={() => selectRow(p)} onDelete={() => setConfirm(p)} />}
                                    </div>
                                ))}
                            </div>
                        }
                        form={paymentForm}
                    />
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function DebtCategoriesTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [cats, setCats]         = useState<DebtCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<DebtCategory | null>(null);
    const [confirm, setConfirm]   = useState<DebtCategory | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm]         = useState({ category_name: '' });

    const load = async () => {
        setLoading(true);
        try { setCats(await apiFetchList<DebtCategory>('/api/v1/categories/debts')); setFetched(true); }
        catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (c: DebtCategory) => {
        setSelected(c);
        setForm({ category_name: c.category_name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm({ category_name: '' }); setError(null); setSheetOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (selected) {
                await apiFetch(`/api/v1/categories/debts/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/api/v1/categories/debts', { method: 'POST', body: JSON.stringify(form) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (c: DebtCategory) => {
        try {
            await apiFetch(`/api/v1/categories/debts/${c.id}`, { method: 'DELETE' });
            if (selected?.id === c.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input type="text" required maxLength={255} className={inputCls} value={form.category_name} onChange={e => setForm({ category_name: e.target.value })} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Delete debt category "${confirm.category_name}"?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                onAddClick={() => { reset(); setSheetOpen(true); }}
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No debt categories." />}
                        {cats.map(c => (
                            <div key={c.id} onClick={() => selectRow(c)} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/40 ${selected?.id === c.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{c.category_name}</span>
                                <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />
                            </div>
                        ))}
                    </div>
                }
                form={formContent}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Debts', 'Payments', 'Categories'] as const;
type SubTab = typeof SUBTABS[number];

export function DebtsTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Debts');
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={t => setSub(t as SubTab)} />
            {sub === 'Debts'      && <DebtsTab_         active={active} />}
            {sub === 'Payments'   && <PaymentsTab        active={active} />}
            {sub === 'Categories' && <DebtCategoriesTab  active={active} />}
        </div>
    );
}
