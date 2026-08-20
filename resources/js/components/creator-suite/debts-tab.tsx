import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Debt, DebtCategory, DebtPayment } from '@/types/api';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { CategoryTab } from './category-tab';
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
    RowActionBar,
    RowActions,
    SplitPane,
    StatusChip,
    SubTabBar,
    TabToolbar,
    dateCls,
    inputCls,
    rowDetailCls,
    rowTitleCls,
    selectCls,
    secondaryBtnFullCls,
    todayStr,
} from './shared';

// ---------------------------------------------------------------------------
// Sub-tab: Debts
// ---------------------------------------------------------------------------

function DebtsListTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [cats, setCats] = useState<DebtCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<Debt | null>(null);
    const [confirm, setConfirm] = useState<Debt | null>(null);
    const [forgiving, setForgiving] = useState<Debt | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { description: '', category_id: '', amount: '', issue_date: todayStr(), notes: '' };
    const [form, setForm] = useState(blank);

    const load = async () => {
        setLoading(true);
        try {
            const [d, c] = await Promise.all([apiFetchList<Debt>('/api/v1/debts'), apiFetchList<DebtCategory>('/api/v1/categories/debts')]);
            setDebts(d);
            setCats(c);
            setFetched(true);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) load();
    }, [active, fetched]);

    const selectRow = (d: Debt) => {
        if (!canMutateFact(d.issue_date)) return;
        setSelected(d);
        setForm({
            description: d.description,
            category_id: String(d.category_id ?? ''),
            amount: String(d.amount),
            issue_date: d.issue_date,
            notes: d.notes ?? '',
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
        if (!canMutateFact(form.issue_date)) {
            setError(loaded ? 'This month is locked.' : 'Checking month locks…');
            return;
        }
        setSaving(true);
        setError(null);
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
            reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (d: Debt) => {
        try {
            await apiFetch(`/api/v1/debts/${d.id}`, { method: 'DELETE' });
            if (selected?.id === d.id) reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        }
        setConfirm(null);
    };

    const handleForgive = async (d: Debt) => {
        try {
            await apiFetch(`/api/v1/debts/${d.id}/forgive`, { method: 'POST' });
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        }
        setForgiving(null);
    };

    const statusChip = (d: Debt) => {
        if (d.is_forgiven) return <StatusChip label="Forgiven" color="amber" />;
        if (d.is_settled) return <StatusChip label="Settled" color="blue" />;
        return null;
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Description">
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>
            <Field label="Category (optional)">
                <select className={selectCls} value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">— none —</option>
                    {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Total Amount">
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
            <Field label="Issue Date">
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.issue_date}
                    onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                />
            </Field>
            <Field label="Notes (optional)">
                <textarea
                    rows={2}
                    maxLength={1000}
                    className={`${inputCls} h-auto resize-none`}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!canMutateFact(form.issue_date)} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete debt "${confirm.description}"?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            {forgiving && (
                <ConfirmModal
                    message={`Mark "${forgiving.description}" as forgiven? Remaining balance will be written off.`}
                    onConfirm={() => handleForgive(forgiving)}
                    onCancel={() => setForgiving(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Debt' : 'New Debt'}
                list={
                    <ListStack>
                        {loading && <LoadingRows />}
                        {!loading && !debts.length && <EmptyRows label="No debts yet." />}
                        {debts.map((d) => {
                            const closed = d.is_settled || d.is_forgiven || d.is_closed;
                            const monthLocked = !canMutateFact(d.issue_date);
                            const canEdit = !closed && !monthLocked;
                            const canForgive = !closed;
                            const forgiveOnly = canForgive && !canEdit;
                            return (
                                <ListRow key={d.id} selected={selected?.id === d.id} disabled={closed}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{d.description}</p>
                                            <p className={`mt-1 ${rowDetailCls}`}>
                                                Balance: {fmtAmount(d.remaining_balance)} / {fmtAmount(d.amount)}
                                            </p>
                                        </div>
                                        {closed ? (
                                            statusChip(d)
                                        ) : canEdit || canForgive ? (
                                            <div
                                                className={`flex shrink-0 flex-col items-stretch gap-2.5 ${forgiveOnly ? 'self-center' : ''}`}
                                            >
                                                {canEdit && (
                                                    <RowActions onEdit={() => selectRow(d)} onDelete={() => setConfirm(d)} />
                                                )}
                                                {canForgive && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setForgiving(d);
                                                        }}
                                                        className={secondaryBtnFullCls}
                                                    >
                                                        Forgive
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
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
// Sub-tab: Payments
// ---------------------------------------------------------------------------

function PaymentsTab({ active, addRef }: { active: boolean; addRef?: MutableRefObject<(() => void) | null> }) {
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [payments, setPayments] = useState<DebtPayment[]>([]);
    const [debtId, setDebtId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<DebtPayment | null>(null);
    const [confirm, setConfirm] = useState<DebtPayment | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { amount: '', paid_at: todayStr(), notes: '' };
    const [form, setForm] = useState(blank);

    useEffect(() => {
        if (!active || fetched) return;
        setLoading(true);
        apiFetchList<Debt>('/api/v1/debts')
            .then((d) => {
                setDebts(d);
                setFetched(true);
            })
            .catch((e: unknown) => setError(errorMessage(e)))
            .finally(() => setLoading(false));
    }, [active, fetched]);

    useEffect(() => {
        if (!debtId) {
            setPayments([]);
            return;
        }
        setPayLoading(true);
        apiFetchList<DebtPayment>(`/api/v1/debts/${debtId}/payments`)
            .then((p) => {
                setPayments(p);
            })
            .catch((e: unknown) => setError(errorMessage(e)))
            .finally(() => setPayLoading(false));
    }, [debtId]);

    const reloadPayments = () => {
        if (!debtId) return;
        setPayLoading(true);
        apiFetchList<DebtPayment>(`/api/v1/debts/${debtId}/payments`)
            .then((p) => setPayments(p))
            .catch((e: unknown) => setError(errorMessage(e)))
            .finally(() => setPayLoading(false));
    };

    const selectRow = (p: DebtPayment) => {
        if (!canMutateFact(p.paid_at)) return;
        setSelected(p);
        setForm({ amount: String(p.amount), paid_at: p.paid_at, notes: p.notes ?? '' });
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
        if (!debtId) return;
        e.preventDefault();
        if (!canMutateFact(form.paid_at)) {
            setError(loaded ? 'This month is locked.' : 'Checking month locks…');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = { amount: Number(form.amount), paid_at: form.paid_at, notes: form.notes || null };
            if (selected) {
                await apiFetch(`/api/v1/debt-payments/${selected.id}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await apiFetch(`/api/v1/debts/${debtId}/payments`, { method: 'POST', body: JSON.stringify(body) });
            }
            reset();
            reloadPayments();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: DebtPayment) => {
        try {
            await apiFetch(`/api/v1/debt-payments/${p.id}`, { method: 'DELETE' });
            if (selected?.id === p.id) reset();
            reloadPayments();
        } catch (err: unknown) {
            setError(errorMessage(err));
        }
        setConfirm(null);
    };

    const selectedDebt = debts.find((d) => d.id === debtId);
    const closed = selectedDebt ? selectedDebt.is_settled || selectedDebt.is_forgiven || selectedDebt.is_closed : false;

    const paymentForm = closed ? (
        <p className="text-sm text-slate-400">This debt is {selectedDebt?.is_forgiven ? 'forgiven' : 'settled'} — no new payments.</p>
    ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
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
            <Field label="Paid At">
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.paid_at}
                    onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                />
            </Field>
            <Field label="Notes (optional)">
                <input
                    type="text"
                    maxLength={1000}
                    className={inputCls}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!canMutateFact(form.paid_at)} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete payment of ${fmtAmount(confirm.amount)}?`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-neutral-300" htmlFor="debt-payment-debt-select">Debt</label>
                    {loading ? (
                        <LoadingRows />
                    ) : (
                        <select
                            id="debt-payment-debt-select"
                            className={selectCls}
                            value={debtId ?? ''}
                            onChange={(e) => {
                                setDebtId(e.target.value ? Number(e.target.value) : null);
                                reset();
                            }}
                        >
                            <option value="">— select a debt —</option>
                            {debts.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.description} ({fmtAmount(d.remaining_balance)} left)
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {debtId && (
                    <SplitPane
                        sheetOpen={sheetOpen}
                        onSheetOpenChange={setSheetOpen}
                        sheetTitle={selected ? 'Edit Payment' : 'New Payment'}
                        list={
                            <ListStack>
                                {payLoading && <LoadingRows />}
                                {!payLoading && !payments.length && <EmptyRows label="No payments for this debt." />}
                                {payments.map((p) => {
                                    const paymentLocked = !canMutateFact(p.paid_at);
                                    return (
                                    <ListRow key={p.id} selected={selected?.id === p.id} disabled={closed}>
                                        <div className="flex items-start justify-between gap-3">
                                            <p className={rowTitleCls}>{fmtAmount(p.amount)}</p>
                                        </div>
                                        <p className={`mt-2 truncate ${rowDetailCls}`}>
                                            {p.paid_at}
                                            {p.notes ? ` · ${p.notes}` : ''}
                                        </p>
                                        {!closed && !paymentLocked && (
                                            <RowActionBar>
                                                <RowActions onEdit={() => selectRow(p)} onDelete={() => setConfirm(p)} />
                                            </RowActionBar>
                                        )}
                                    </ListRow>
                                    );
                                })}
                            </ListStack>
                        }
                        form={paymentForm}
                    />
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Debts', 'Payments', 'Categories'] as const;
type SubTab = (typeof SUBTABS)[number];

export function DebtsTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Debts');
    const addRef = useRef<(() => void) | null>(null);
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                <AddButton onClick={() => addRef.current?.()} />
            </TabToolbar>
            {sub === 'Debts' && <DebtsListTab addRef={addRef} active={active} />}
            {sub === 'Payments' && <PaymentsTab addRef={addRef} active={active} />}
            {sub === 'Categories' && (
                <CategoryTab
                    active={active}
                    addRef={addRef}
                    listUrl="/api/v1/categories/debts"
                    storeUrl="/api/v1/categories/debts"
                    updateUrl={(id) => `/api/v1/categories/debts/${id}`}
                    deleteUrl={(id) => `/api/v1/categories/debts/${id}`}
                    emptyLabel="No debt categories."
                    deleteConfirmMessage={(name) => `Delete debt category "${name}"?`}
                />
            )}
        </div>
    );
}
