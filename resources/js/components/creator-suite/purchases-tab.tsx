import { useEffect, useState } from 'react';
import {
    ApiError, ConfirmModal, EmptyRows, Field,
    FormActions, LoadingRows, Purchase, PurchaseCategory,
    RowActions, SplitPane, StatusChip, SubTabBar,
    apiFetch, apiFetchList, inputCls, selectCls, todayStr,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-tab: Items
// ---------------------------------------------------------------------------

function ItemsTab({ active }: { active: boolean }) {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [cats, setCats]           = useState<PurchaseCategory[]>([]);
    const [loading, setLoading]     = useState(false);
    const [fetched, setFetched]     = useState(false);
    const [selected, setSelected]   = useState<Purchase | null>(null);
    const [confirm, setConfirm]     = useState<Purchase | null>(null);
    const [refundConfirm, setRefundConfirm] = useState<Purchase | null>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);

    const blank = { category_id: '', description: '', amount: '', date: todayStr() };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([
                apiFetchList<Purchase>('/api/v1/purchases'),
                apiFetchList<PurchaseCategory>('/api/v1/categories/purchases'),
            ]);
            setPurchases(p);
            setCats(c.filter(c => !c.deleted_at)); // active only for the form selector
            setFetched(true);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (p: Purchase) => {
        setSelected(p);
        setForm({ category_id: String(p.category_id), description: p.description, amount: String(p.amount), date: p.date });
        setError(null);
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = { category_id: Number(form.category_id), description: form.description, amount: Number(form.amount), date: form.date };
            if (selected) {
                await apiFetch(`/api/v1/purchases/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/purchases', { method: 'POST', body: JSON.stringify(body) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (p: Purchase) => {
        try {
            await apiFetch(`/api/v1/purchases/${p.id}`, { method: 'DELETE' });
            if (selected?.id === p.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const handleRefund = async (p: Purchase) => {
        try {
            await apiFetch(`/api/v1/purchases/${p.id}/refund`, { method: 'POST' });
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setRefundConfirm(null);
    };

    const catName = (id: number) => cats.find(c => c.id === id)?.category_name ?? '—';

    return (
        <>
            {confirm && <ConfirmModal message={`Delete purchase "${confirm.description}"? This cannot be undone if the month has passed.`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            {refundConfirm && <ConfirmModal message={`Mark "${refundConfirm.description}" as refunded? This will add a matching income entry.`} onConfirm={() => handleRefund(refundConfirm)} onCancel={() => setRefundConfirm(null)} />}
            <SplitPane
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !purchases.length && <EmptyRows label="No purchases yet." />}
                        {purchases.map(p => {
                            const locked = p.is_refunded;
                            return (
                                <div key={p.id} onClick={() => !locked && selectRow(p)}
                                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${locked ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === p.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-100">{p.description}</p>
                                        <p className="text-slate-400">{p.date} · {catName(p.category_id)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 pl-2">
                                        {p.is_refunded && <StatusChip label="Refunded" color="blue" />}
                                        <span className="font-semibold text-rose-500">${p.amount.toFixed(2)}</span>
                                        <RowActions
                                            onEdit={locked ? undefined : () => selectRow(p)}
                                            onDelete={locked ? undefined : () => setConfirm(p)}
                                            extra={!p.is_refunded ? (
                                                <button onClick={e => { e.stopPropagation(); setRefundConfirm(p); }}
                                                    className="rounded px-2 py-0.5 text-[10px] font-medium text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                                                    Refund
                                                </button>
                                            ) : undefined}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }
                form={
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{selected ? 'Edit Purchase' : 'New Purchase'}</p>
                        {error && <ApiError message={error} onDismiss={() => setError(null)} />}
                        <Field label="Description">
                            <input type="text" required maxLength={255} className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </Field>
                        <Field label="Category">
                            <select required className={selectCls} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                                <option value="">— select —</option>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                            </select>
                        </Field>
                        <Field label="Amount">
                            <input type="number" step="0.01" min="0.01" required className={inputCls} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                        </Field>
                        <Field label="Date">
                            <input type="date" required className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                        </Field>
                        <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
                    </form>
                }
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function CategoriesTab({ active }: { active: boolean }) {
    const [cats, setCats]         = useState<PurchaseCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<PurchaseCategory | null>(null);
    const [confirm, setConfirm]   = useState<PurchaseCategory | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [form, setForm]         = useState({ category_name: '' });

    const load = async () => {
        setLoading(true);
        try { setCats(await apiFetchList<PurchaseCategory>('/api/v1/categories/purchases')); setFetched(true); }
        catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (c: PurchaseCategory) => { setSelected(c); setForm({ category_name: c.category_name }); setError(null); };
    const reset = () => { setSelected(null); setForm({ category_name: '' }); setError(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (selected) {
                await apiFetch(`/api/v1/categories/purchases/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/api/v1/categories/purchases', { method: 'POST', body: JSON.stringify(form) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (c: PurchaseCategory) => {
        try {
            await apiFetch(`/api/v1/categories/purchases/${c.id}`, { method: 'DELETE' });
            if (selected?.id === c.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    return (
        <>
            {confirm && <ConfirmModal message={`Remove category "${confirm.category_name}"? It will be unlisted if purchases reference it.`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <SplitPane
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No purchase categories." />}
                        {cats.map(c => (
                            <div key={c.id} onClick={() => !c.deleted_at && selectRow(c)}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${c.deleted_at ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === c.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{c.category_name}</span>
                                <div className="flex items-center gap-2">
                                    {c.deleted_at && <StatusChip label="Unlisted" color="amber" />}
                                    {!c.deleted_at && <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />}
                                </div>
                            </div>
                        ))}
                    </div>
                }
                form={
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{selected ? 'Edit Category' : 'New Category'}</p>
                        {error && <ApiError message={error} onDismiss={() => setError(null)} />}
                        <Field label="Name">
                            <input type="text" required maxLength={255} className={inputCls} value={form.category_name} onChange={e => setForm({ category_name: e.target.value })} />
                        </Field>
                        <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
                    </form>
                }
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Items', 'Categories'] as const;
type SubTab = typeof SUBTABS[number];

export function PurchasesTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Items');
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={t => setSub(t as SubTab)} />
            {sub === 'Items'      && <ItemsTab      active={active} />}
            {sub === 'Categories' && <CategoriesTab active={active} />}
        </div>
    );
}
