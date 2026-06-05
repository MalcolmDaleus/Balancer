import { MutableRefObject, useEffect, useRef, useState } from 'react';
import {
    AddButton,
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    IncomeCategory,
    IncomeEntry,
    IncomeStream,
    ListRow,
    ListStack,
    LoadingRows,
    RowActionBar,
    RowActions,
    SplitPane,
    StatusChip,
    SubTabBar,
    TabToolbar,
    apiFetch,
    apiFetchList,
    dateCls,
    inputCls,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    selectCls,
    thisMonthStr,
    useIsMobile,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-tab: Entries
// ---------------------------------------------------------------------------

function EntriesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [streams, setStreams] = useState<IncomeStream[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<IncomeEntry | null>(null);
    const [confirm, setConfirm] = useState<IncomeEntry | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { income_stream_id: '', amount: '', month: thisMonthStr() };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [e, s] = await Promise.all([
                apiFetchList<IncomeEntry>('/api/v1/income/entries'),
                apiFetchList<IncomeStream>('/api/v1/income/streams'),
            ]);
            setEntries(e);
            setStreams(s);
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

    const selectRow = (entry: IncomeEntry) => {
        setSelected(entry);
        setForm({
            income_stream_id: String(entry.income_stream_id),
            amount: String(entry.amount),
            month: entry.month?.slice(0, 7) ?? thisMonthStr(),
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const body = {
                income_stream_id: Number(form.income_stream_id),
                amount: Number(form.amount),
                month: form.month,
            };
            if (selected) {
                await apiFetch(`/api/v1/income/entries/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/income/entries', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (entry: IncomeEntry) => {
        try {
            await apiFetch(`/api/v1/income/entries/${entry.id}`, { method: 'DELETE' });
            if (selected?.id === entry.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
    };

    const streamName = (id: number) => streams.find((s) => s.id === id)?.name ?? '—';

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Stream">
                <select
                    required
                    className={selectCls}
                    value={form.income_stream_id}
                    onChange={(e) => setForm((f) => ({ ...f, income_stream_id: e.target.value }))}
                >
                    <option value="">— select stream —</option>
                    {streams.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
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
                    className={dateCls}
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete this income entry of $${confirm.amount}?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Entry' : 'New Entry'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !entries.length && <EmptyRows label="No income entries yet." />}
                        {entries.map((entry) => (
                            <ListRow
                                key={entry.id}
                                selected={selected?.id === entry.id}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className={rowTitleCls}>{streamName(entry.income_stream_id)}</p>
                                    <span className={`${rowAmountCls} text-emerald-600 dark:text-emerald-400`}>
                                        ${entry.amount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className={rowDetailCls}>{entry.month?.slice(0, 7)}</span>
                                    <RowActions onEdit={() => selectRow(entry)} onDelete={() => setConfirm(entry)} />
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
// Sub-tab: Streams
// ---------------------------------------------------------------------------

function StreamsTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [streams, setStreams] = useState<IncomeStream[]>([]);
    const [cats, setCats] = useState<IncomeCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<IncomeStream | null>(null);
    const [confirm, setConfirm] = useState<IncomeStream | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { name: '', category_id: '', description: '' };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [s, c] = await Promise.all([
                apiFetchList<IncomeStream>('/api/v1/income/streams'),
                apiFetchList<IncomeCategory>('/api/v1/categories/income'),
            ]);
            setStreams(s);
            setCats(c);
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

    const selectRow = (s: IncomeStream) => {
        setSelected(s);
        setForm({ name: s.name, category_id: String(s.category_id ?? ''), description: s.description ?? '' });
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
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const body = { name: form.name, category_id: form.category_id ? Number(form.category_id) : null, description: form.description || null };
            if (selected) {
                await apiFetch(`/api/v1/income/streams/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch('/api/v1/income/streams', { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (s: IncomeStream) => {
        try {
            await apiFetch(`/api/v1/income/streams/${s.id}`, { method: 'DELETE' });
            if (selected?.id === s.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
            </Field>
            <Field label="Category (optional)">
                <select className={selectCls} value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— none —</option>
                    {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.category_name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Description (optional)">
                <input
                    type="text"
                    maxLength={1000}
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Deactivate stream "${confirm.name}"?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Stream' : 'New Stream'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !streams.length && <EmptyRows label="No income streams yet." />}
                        {streams.map((s) => (
                            <ListRow
                                key={s.id}
                                selected={selected?.id === s.id}
                                disabled={!!s.is_system}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className={rowTitleCls}>{s.name}</p>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {s.is_system && <StatusChip label="System" color="violet" />}
                                        {s.deleted_at && <StatusChip label="Inactive" color="amber" />}
                                    </div>
                                </div>
                                {s.description && <p className={`mt-1.5 truncate ${rowDetailCls}`}>{s.description}</p>}
                                {!s.is_system && (
                                    <RowActionBar>
                                        <RowActions
                                            onEdit={() => selectRow(s)}
                                            onDelete={() => setConfirm(s)}
                                            editDisabled={!!s.deleted_at}
                                            deleteDisabled={!!s.deleted_at}
                                        />
                                    </RowActionBar>
                                )}
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
// Sub-tab: Categories
// ---------------------------------------------------------------------------

function CategoriesTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const [cats, setCats] = useState<IncomeCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<IncomeCategory | null>(null);
    const [confirm, setConfirm] = useState<IncomeCategory | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm] = useState({ category_name: '' });

    const load = async () => {
        setLoading(true);
        try {
            setCats(await apiFetchList<IncomeCategory>('/api/v1/categories/income'));
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

    const selectRow = (c: IncomeCategory) => {
        setSelected(c);
        setForm({ category_name: c.category_name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };
    const reset = () => {
        setSelected(null);
        setForm({ category_name: '' });
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm({ category_name: '' });
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                await apiFetch(`/api/v1/categories/income/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await apiFetch('/api/v1/categories/income', { method: 'POST', body: JSON.stringify(form) });
            }
            reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c: IncomeCategory) => {
        try {
            await apiFetch(`/api/v1/categories/income/${c.id}`, { method: 'DELETE' });
            if (selected?.id === c.id) reset();
            setFetched(false);
        } catch (err: any) {
            setError(err.message);
        }
        setConfirm(null);
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.category_name}
                    onChange={(e) => setForm({ category_name: e.target.value })}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete category "${confirm.category_name}"?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label="No income categories." />}
                        {cats.map((c) => (
                            <ListRow key={c.id} selected={selected?.id === c.id}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className={rowTitleCls}>{c.category_name}</span>
                                    <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />
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

const SUBTABS = ['Entries', 'Streams', 'Categories'] as const;
type SubTab = (typeof SUBTABS)[number];

export function IncomeTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Entries');
    const addRef = useRef<(() => void) | null>(null);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                <AddButton onClick={() => addRef.current?.()} />
            </TabToolbar>
            {sub === 'Entries' && <EntriesTab addRef={addRef} active={active} />}
            {sub === 'Streams' && <StreamsTab addRef={addRef} active={active} />}
            {sub === 'Categories' && <CategoriesTab addRef={addRef} active={active} />}
        </div>
    );
}
