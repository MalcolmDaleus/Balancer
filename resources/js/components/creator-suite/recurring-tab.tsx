import { useEffect, useState } from 'react';
import {
    ApiError, ConfirmModal, EmptyRows, Field,
    FormActions, LoadingRows, RecurringCategory, RecurringStream,
    RowActions, SplitPane, StatusChip, SubTabBar,
    apiFetch, apiFetchList, dateCls, inputCls, selectCls, todayStr, useIsMobile,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-tab: Streams
// ---------------------------------------------------------------------------

function StreamsTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [streams, setStreams]   = useState<RecurringStream[]>([]);
    const [cats, setCats]         = useState<RecurringCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<RecurringStream | null>(null);
    const [confirm, setConfirm]   = useState<RecurringStream | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blankStream = { name: '', recurring_payment_category_id: '', description: '' };
    const [form, setForm]         = useState(blankStream);
    const blankPrice  = { amount: '', start_date: todayStr(), frequency: 'monthly', day_of_month: '' };
    const [priceForm, setPriceForm] = useState(blankPrice);
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);
    const [savingPrice, setSavingPrice] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [s, c] = await Promise.all([
                apiFetchList<RecurringStream>('/api/v1/recurring-payments/streams'),
                apiFetchList<RecurringCategory>('/api/v1/recurring-payments/categories'),
            ]);
            setStreams(s); setCats(c); setFetched(true);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (s: RecurringStream) => {
        setSelected(s);
        setForm({ name: s.name, recurring_payment_category_id: String(s.recurring_payment_category_id ?? ''), description: s.description ?? '' });
        setShowPriceUpdate(false);
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => {
        setSelected(null);
        setForm(blankStream);
        setPriceForm(blankPrice);
        setShowPriceUpdate(false);
        setError(null);
        setSheetOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const body = {
                name: form.name,
                recurring_payment_category_id: form.recurring_payment_category_id ? Number(form.recurring_payment_category_id) : null,
                description: form.description || null,
            };
            if (selected) {
                await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/recurring-payments/streams', { method: 'POST', body: JSON.stringify(body) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handlePriceUpdate = async (e: React.FormEvent) => {
        if (!selected) return;
        e.preventDefault();
        setSavingPrice(true); setError(null);
        try {
            const body: Record<string, unknown> = {
                amount: Number(priceForm.amount),
                start_date: priceForm.start_date,
                frequency: priceForm.frequency,
            };
            if (priceForm.day_of_month) body.day_of_month = Number(priceForm.day_of_month);
            await apiFetch(`/api/v1/recurring-payments/streams/${selected.id}/update-price`, { method: 'POST', body: JSON.stringify(body) });
            setShowPriceUpdate(false);
            setPriceForm(blankPrice);
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSavingPrice(false); }
    };

    const handleDelete = async (s: RecurringStream) => {
        try {
            await apiFetch(`/api/v1/recurring-payments/streams/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const activeAmount = (s: RecurringStream) => {
        const entry = s.entries?.find(e => e.active && !e.end_date);
        return entry ? `$${entry.amount.toFixed(2)}` : null;
    };

    const formContent = (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
                {error && !showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                <Field label="Name">
                    <input type="text" required maxLength={64} className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="Category (optional)">
                    <select className={selectCls} value={form.recurring_payment_category_id} onChange={e => setForm(f => ({ ...f, recurring_payment_category_id: e.target.value }))}>
                        <option value="">— none —</option>
                        {cats.filter(c => !c.deleted_at).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Description (optional)">
                    <input type="text" maxLength={255} className={inputCls} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
                <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
            </form>

            {selected && !selected.deleted_at && (
                <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
                    {!showPriceUpdate ? (
                        <button onClick={() => setShowPriceUpdate(true)}
                                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-500 hover:bg-indigo-100 dark:bg-indigo-700 dark:text-indigo-50 dark:hover:bg-indigo-600">
                            + Update subscription price
                        </button>
                    ) : (
                        <form onSubmit={handlePriceUpdate} className="space-y-3">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Update Price</p>
                            {error && showPriceUpdate && <ApiError message={error} onDismiss={() => setError(null)} />}
                            <Field label="New Amount">
                                <input type="number" step="0.01" min="0.01" required className={inputCls} value={priceForm.amount} onChange={e => setPriceForm(f => ({ ...f, amount: e.target.value }))} />
                            </Field>
                            <Field label="Effective From">
                                <input type="date" required className={dateCls} value={priceForm.start_date} onChange={e => setPriceForm(f => ({ ...f, start_date: e.target.value }))} />
                            </Field>
                            <Field label="Frequency">
                                <select className={selectCls} value={priceForm.frequency} onChange={e => setPriceForm(f => ({ ...f, frequency: e.target.value }))}>
                                    <option value="monthly">Monthly</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </Field>
                            {priceForm.frequency !== 'weekly' && (
                                <Field label="Day of month">
                                    <input type="number" min="1" max="31" className={inputCls} value={priceForm.day_of_month} onChange={e => setPriceForm(f => ({ ...f, day_of_month: e.target.value }))} />
                                </Field>
                            )}
                            <FormActions isEdit={true} saving={savingPrice} onCancel={() => { setShowPriceUpdate(false); setPriceForm(blankPrice); }} saveLabel="Apply Price Change" />
                        </form>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Deactivate stream "${confirm.name}"?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Stream' : 'New Stream'}
                onAddClick={() => { reset(); setSheetOpen(true); }}
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !streams.length && <EmptyRows label="No recurring streams yet." />}
                        {streams.map(s => (
                            <div key={s.id} onClick={() => !s.deleted_at && selectRow(s)}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${s.deleted_at ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === s.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                                    <p className="text-slate-400">{s.category?.name ?? 'Uncategorized'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeAmount(s) && <span className="font-semibold text-slate-700 dark:text-slate-200">{activeAmount(s)}</span>}
                                    {s.deleted_at && <StatusChip label="Inactive" color="amber" />}
                                    {!s.deleted_at && <RowActions onEdit={() => selectRow(s)} onDelete={() => setConfirm(s)} />}
                                </div>
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
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function RecurringCategoriesTab({ active }: { active: boolean }) {
    const isMobile = useIsMobile();
    const [cats, setCats]         = useState<RecurringCategory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const [selected, setSelected] = useState<RecurringCategory | null>(null);
    const [confirm, setConfirm]   = useState<RecurringCategory | null>(null);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm]         = useState({ name: '' });

    const load = async () => {
        setLoading(true);
        try { setCats(await apiFetchList<RecurringCategory>('/api/v1/recurring-payments/categories')); setFetched(true); }
        catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (active && !fetched) load(); }, [active, fetched]);

    const selectRow = (c: RecurringCategory) => {
        setSelected(c);
        setForm({ name: c.name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => { setSelected(null); setForm({ name: '' }); setError(null); setSheetOpen(false); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            if (selected) {
                await apiFetch(`/api/v1/recurring-payments/categories/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/api/v1/recurring-payments/categories', { method: 'POST', body: JSON.stringify(form) });
            }
            reset(); setFetched(false);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (c: RecurringCategory) => {
        try {
            await apiFetch(`/api/v1/recurring-payments/categories/${c.id}`, { method: 'DELETE' });
            if (selected?.id === c.id) reset();
            setFetched(false);
        } catch (err: any) { setError(err.message); }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input type="text" required maxLength={255} className={inputCls} value={form.name} onChange={e => setForm({ name: e.target.value })} />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && <ConfirmModal message={`Remove category "${confirm.name}"?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                onAddClick={() => { reset(); setSheetOpen(true); }}
                list={
                    <div className="space-y-1">
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No recurring categories." />}
                        {cats.map(c => (
                            <div key={c.id} onClick={() => !c.deleted_at && selectRow(c)}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${c.deleted_at ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'} ${selected?.id === c.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
                                <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                                <div className="flex items-center gap-2">
                                    {c.deleted_at && <StatusChip label="Unlisted" color="amber" />}
                                    {!c.deleted_at && <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />}
                                </div>
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

const SUBTABS = ['Streams', 'Categories'] as const;
type SubTab = typeof SUBTABS[number];

export function RecurringTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Streams');
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={t => setSub(t as SubTab)} />
            {sub === 'Streams'    && <StreamsTab             active={active} />}
            {sub === 'Categories' && <RecurringCategoriesTab active={active} />}
        </div>
    );
}
