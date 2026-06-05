import { MutableRefObject, useEffect, useRef, useState } from 'react';
import {
    AddButton, ApiError, ConfirmModal, EmptyRows, Field,
    FormActions, ListRow, ListStack, LoadingRows, Purchase, PurchaseCategory,
    RowActions, SplitPane, StatusChip, SubTabBar, TabToolbar,
    apiFetch, apiFetchList, dateCls, inputCls, rowAmountCls, rowDetailCls, rowTitleCls,
    selectCls, todayStr, useIsMobile,
} from './shared';

const refundBtnCls = 'w-full rounded-full bg-indigo-50 px-3 py-1 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-700 dark:text-indigo-50 dark:hover:bg-indigo-600';

// ---------------------------------------------------------------------------
// Sub-tab: Items
// ---------------------------------------------------------------------------

function ItemsTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [cats, setCats]           = useState<PurchaseCategory[]>([]);
    const [loading, setLoading]     = useState(false);
    const [fetched, setFetched]     = useState(false);
    const [selected, setSelected]   = useState<Purchase | null>(null);
    const [confirm, setConfirm]     = useState<Purchase | null>(null);
    const [refundConfirm, setRefundConfirm] = useState<Purchase | null>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { category_id: '', description: '', amount: '', date: todayStr(), url: '', attachment_path: '' };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([
                apiFetchList<Purchase>('/api/v1/purchases'),
                apiFetchList<PurchaseCategory>('/api/v1/categories/purchases'),
            ]);
            setPurchases(p);
            setCats(c.filter(c => !c.deleted_at));
            setFetched(true);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (p: Purchase) => {
        setSelected(p);
        setForm({
            category_id: String(p.category_id),
            description: p.description,
            amount: String(p.amount),
            date: p.date,
            url: p.url ?? '',
            attachment_path: p.attachment_path ?? '',
        });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm(blank); setError(null); setSheetOpen(false); };

    useEffect(() => {
        if (addRef) { addRef.current = () => { setSelected(null); setForm(blank); setError(null); setSheetOpen(true); }; }
        return () => { if (addRef) addRef.current = null; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = {
                category_id: Number(form.category_id),
                description: form.description,
                amount: Number(form.amount),
                date: form.date,
                url: form.url.trim() || null,
                attachment_path: form.attachment_path.trim() || null,
            };
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

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
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
                <input type="date" required className={dateCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Link (optional)">
                <input type="url" maxLength={500} placeholder="https://…" className={inputCls} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </Field>
            <Field label="Attachment path (optional)">
                <input type="text" maxLength={500} placeholder="Receipt or file path" className={inputCls} value={form.attachment_path} onChange={e => setForm(f => ({ ...f, attachment_path: e.target.value }))} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Delete purchase "${confirm.description}"? This cannot be undone if the month has passed.`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            {refundConfirm && <ConfirmModal message={`Mark "${refundConfirm.description}" as refunded? This will add a matching income entry.`} onConfirm={() => handleRefund(refundConfirm)} onCancel={() => setRefundConfirm(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Purchase' : 'New Purchase'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !purchases.length && <EmptyRows label="No purchases yet." />}
                        {purchases.map(p => {
                            const locked = p.is_refunded;
                            return (
                                <ListRow
                                    key={p.id}
                                    selected={selected?.id === p.id}
                                    disabled={locked}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{p.description}</p>
                                            <p className={`mt-1 ${rowAmountCls} text-rose-500 dark:text-rose-400`}>
                                                ${p.amount.toFixed(2)}
                                            </p>
                                            <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                                {p.date} · {catName(p.category_id)}
                                            </p>
                                        </div>
                                        {locked ? (
                                            <StatusChip label="Refunded" color="blue" />
                                        ) : (
                                            <div className="flex shrink-0 flex-col items-stretch gap-1">
                                                <RowActions
                                                    onEdit={() => selectRow(p)}
                                                    onDelete={() => setConfirm(p)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); setRefundConfirm(p); }}
                                                    className={refundBtnCls}
                                                >
                                                    Refund
                                                </button>
                                            </div>
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
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function CategoriesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [cats, setCats]         = useState<PurchaseCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<PurchaseCategory | null>(null);
    const [confirm, setConfirm]   = useState<PurchaseCategory | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm]         = useState({ category_name: '' });

    const load = async () => {
        setLoading(true);
        try { setCats(await apiFetchList<PurchaseCategory>('/api/v1/categories/purchases')); setFetched(true); }
        catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (c: PurchaseCategory) => {
        setSelected(c);
        setForm({ category_name: c.category_name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm({ category_name: '' }); setError(null); setSheetOpen(false); };

    useEffect(() => {
        if (addRef) { addRef.current = () => { setSelected(null); setForm({ category_name: '' }); setError(null); setSheetOpen(true); }; }
        return () => { if (addRef) addRef.current = null; };
    }, []);

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
            {confirm && <ConfirmModal message={`Remove category "${confirm.category_name}"? It will be unlisted if purchases reference it.`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No purchase categories." />}
                        {cats.map(c => (
                            <ListRow
                                key={c.id}
                                selected={selected?.id === c.id}
                                disabled={!!c.deleted_at}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className={rowTitleCls}>{c.category_name}</span>
                                    <div className="flex items-center gap-2">
                                        {c.deleted_at && <StatusChip label="Unlisted" color="amber" />}
                                        {!c.deleted_at && <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />}
                                    </div>
                                </div>
                            </ListRow>
                        ))}
                    </ListStack>
                }
                form={formContent}
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
    const addRef = useRef<(() => void) | null>(null);
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={t => setSub(t as SubTab)} />
                <AddButton onClick={() => addRef.current?.()} />
            </TabToolbar>
            {sub === 'Items'      && <ItemsTab      addRef={addRef} active={active} />}
            {sub === 'Categories' && <CategoriesTab addRef={addRef} active={active} />}
        </div>
    );
}
