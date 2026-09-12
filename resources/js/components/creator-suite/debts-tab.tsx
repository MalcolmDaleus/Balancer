import { apiFetch, apiFetchList, errorMessage, isNotFound } from '@/api/client';
import { ledgerCopy } from '@/config/ledger-copy';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { toastError } from '@/lib/toast';
import { useFormatMoney } from '@/hooks/use-format-money';
import type { Debt, DebtCategory, DebtPayment } from '@/types/api';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryTab } from './category-tab';
import { blankFactFilter, FactFilterBar, matchesFactFilter, monthRangeContaining, type FactFilterValues } from './fact-filters';
import type { LedgerFocus } from './ledger-focus';
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
    dropById,
    SubTabBar,
    TabToolbar,
    dateCls,
    inputCls,
    instrumentDanger,
    instrumentRemoveConfirm,
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
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [cats, setCats] = useState<DebtCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<Debt | null>(null);
    const [confirm, setConfirm] = useState<Debt | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
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
            amount: centsToInput(d.amount_cents),
            issue_date: d.issue_date,
            notes: d.notes ?? '',
        });
        setError(null);
        setSheetOpen(true);
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
            const msg = loaded ? ledgerCopy.common.monthLocked : ledgerCopy.common.checkingLocks;
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = {
                description: form.description,
                category_id: form.category_id ? Number(form.category_id) : null,
                amount_cents: majorInputToCents(form.amount),
                issue_date: form.issue_date,
                notes: form.notes || null,
            };
            if (selected) {
                await apiFetch(`/api/v1/debts/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.common.saved,
                });
            } else {
                await apiFetch('/api/v1/debts', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.debts.debtAdded,
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

    const handleDelete = async (d: Debt) => {
        setConfirm(null);
        setRemovingId(d.id);
        try {
            await apiFetch(`/api/v1/debts/${d.id}`, {
                method: 'DELETE',
                toast: d.can_hard_delete ? ledgerCopy.common.deleted : ledgerCopy.common.archived,
            });
            setDebts(dropById(d.id));
            if (selected?.id === d.id) reset();
        } catch (err: unknown) {
            if (isNotFound(err)) {
                setDebts(dropById(d.id));
                if (selected?.id === d.id) reset();
                return;
            }
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const handleForgive = async (d: Debt) => {
        try {
            await apiFetch(`/api/v1/debts/${d.id}/forgive`, { method: 'POST', toast: ledgerCopy.debts.forgivenToast });
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        }
        setForgiving(null);
    };

    const statusChip = (d: Debt) => {
        if (d.is_forgiven) return <StatusChip label={ledgerCopy.debts.forgiven} color="amber" />;
        if (d.is_settled) return <StatusChip label={ledgerCopy.debts.settled} color="blue" />;
        return null;
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label={ledgerCopy.debts.description}>
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </Field>
            <Field label={ledgerCopy.debts.categoryOptional}>
                <select className={selectCls} value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">{ledgerCopy.common.noneOption}</option>
                    {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label={ledgerCopy.debts.totalAmount}>
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
            <Field label={ledgerCopy.debts.issueDate}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.issue_date}
                    onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                />
            </Field>
            <Field label={ledgerCopy.common.notesOptional}>
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
                    {...instrumentRemoveConfirm(
                        confirm.description,
                        confirm.can_hard_delete,
                        ledgerCopy.debts.archiveDebt(confirm.description),
                    )}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            {forgiving && (
                <ConfirmModal
                    message={ledgerCopy.debts.forgiveDebt(forgiving.description)}
                    onConfirm={() => handleForgive(forgiving)}
                    onCancel={() => setForgiving(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                onDismiss={reset}
                sheetTitle={selected ? ledgerCopy.debts.editDebt : ledgerCopy.debts.newDebt}
                list={
                    <ListStack>
                        {loading && !debts.length && <LoadingRows />}
                        {!loading && !debts.length && <EmptyRows label={ledgerCopy.debts.noDebts} />}
                        {debts.map((d) => {
                            const closed = d.is_settled || d.is_forgiven || d.is_closed;
                            const monthLocked = !canMutateFact(d.issue_date);
                            const canEdit = !closed && !monthLocked;
                            const canForgive = !closed;
                            const canDelete = d.can_hard_delete;
                            const canArchive = Boolean(d.can_archive);
                            const forgiveOnly = canForgive && !canEdit && !canDelete;
                            const busy = removingId === d.id;
                            return (
                                <ListRow key={d.id} selected={selected?.id === d.id} busy={busy} onClick={() => selectRow(d)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{d.description}</p>
                                            <p className={`mt-1 ${rowDetailCls}`}>
                                                {ledgerCopy.debts.balance(fmtAmount(d.remaining_cents), fmtAmount(d.amount_cents))}
                                            </p>
                                        </div>
                                        {closed ? (
                                            <div className="flex shrink-0 flex-col items-stretch gap-2.5">
                                                {statusChip(d)}
                                                {canArchive && (
                                                    <RowActions
                                                        onDelete={() => setConfirm(d)}
                                                        {...instrumentDanger(false)}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                className={`flex shrink-0 flex-col items-stretch gap-2.5 ${forgiveOnly ? 'self-center' : ''}`}
                                            >
                                                {(canEdit || canDelete) && (
                                                    <RowActions
                                                        onEdit={canEdit ? () => selectRow(d) : undefined}
                                                        onDelete={canDelete ? () => setConfirm(d) : undefined}
                                                        {...instrumentDanger(true)}
                                                    />
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
                                                        {ledgerCopy.debts.forgive}
                                                    </button>
                                                )}
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
// Sub-tab: Payments
// ---------------------------------------------------------------------------

function PaymentsTab({
    active,
    addRef,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    addRef?: MutableRefObject<(() => void) | null>;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
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
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { amount: '', paid_at: todayStr(), notes: '' };
    const [form, setForm] = useState(blank);
    const [filter, setFilter] = useState<FactFilterValues>(blankFactFilter);

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

    const visiblePayments = useMemo(
        () =>
            payments.filter((p) =>
                matchesFactFilter(
                    {
                        date: p.paid_at,
                        amountCents: p.amount_cents,
                        text: p.notes ?? '',
                    },
                    filter,
                ),
            ),
        [payments, filter],
    );

    const selectRow = (p: DebtPayment) => {
        setSelected(p);
        setForm({ amount: centsToInput(p.amount_cents), paid_at: p.paid_at, notes: p.notes ?? '' });
        setError(null);
        setSheetOpen(true);
    };

    useEffect(() => {
        if (!focus || focus.domain !== 'debt') return;
        if (focus.instrumentId) {
            setDebtId(focus.instrumentId);
        }
        setFilter((f) => ({ ...f, ...monthRangeContaining(focus.occurredOn) }));
    }, [focus]);

    useEffect(() => {
        if (!focus || focus.domain !== 'debt' || !debtId) return;
        const p = payments.find((row) => row.id === focus.sourceId);
        if (!p) return;
        selectRow(p);
        onFocusConsumed?.();
    }, [focus, payments, debtId]);
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
            const msg = loaded ? ledgerCopy.common.monthLocked : ledgerCopy.common.checkingLocks;
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = { amount_cents: majorInputToCents(form.amount), paid_at: form.paid_at, notes: form.notes || null };
            if (selected) {
                await apiFetch(`/api/v1/debt-payments/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.common.saved,
                });
            } else {
                await apiFetch(`/api/v1/debts/${debtId}/payments`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: ledgerCopy.debts.paymentAdded,
                });
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
        setConfirm(null);
        setRemovingId(p.id);
        try {
            await apiFetch(`/api/v1/debt-payments/${p.id}`, { method: 'DELETE', toast: ledgerCopy.common.deleted });
            setPayments(dropById(p.id));
            if (selected?.id === p.id) reset();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const selectedDebt = debts.find((d) => d.id === debtId);
    const closed = selectedDebt ? selectedDebt.is_settled || selectedDebt.is_forgiven || selectedDebt.is_closed : false;

    const paymentForm = closed ? (
        <p className="text-sm text-slate-400">{ledgerCopy.debts.closedNoPayments(selectedDebt?.is_forgiven ? ledgerCopy.debts.forgivenLower : ledgerCopy.debts.settledLower)}</p>
    ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label={ledgerCopy.common.amount}>
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
            <Field label={ledgerCopy.debts.paidAt}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.paid_at}
                    onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                />
            </Field>
            <Field label={ledgerCopy.common.notesOptional}>
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
                    message={ledgerCopy.debts.deletePayment(fmtAmount(confirm.amount_cents))}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-neutral-300" htmlFor="debt-payment-debt-select">{ledgerCopy.debts.debt}</label>
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
                            <option value="">{ledgerCopy.debts.selectDebt}</option>
                            {debts.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.description} ({ledgerCopy.debts.remainingLeft(fmtAmount(d.remaining_cents))})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {debtId && (
                    <>
                    <FactFilterBar value={filter} onChange={setFilter} />
                    <SplitPane
                        sheetOpen={sheetOpen}
                        onSheetOpenChange={setSheetOpen}
                        onDismiss={reset}
                        sheetTitle={selected ? ledgerCopy.debts.editPayment : ledgerCopy.debts.newPayment}
                        list={
                            <ListStack>
                                {payLoading && !payments.length && <LoadingRows />}
                                {!payLoading && !payments.length && <EmptyRows label={ledgerCopy.debts.noPayments} />}
                                {!payLoading && payments.length > 0 && !visiblePayments.length && (
                                    <EmptyRows label={ledgerCopy.debts.noPaymentsMatch} />
                                )}
                                {visiblePayments.map((p) => {
                                    const paymentLocked = !canMutateFact(p.paid_at);
                                    return (
                                    <ListRow key={p.id} selected={selected?.id === p.id} disabled={closed} busy={removingId === p.id} onClick={() => selectRow(p)}>
                                        <div className="flex items-start justify-between gap-3">
                                            <p className={rowTitleCls}>{fmtAmount(p.amount_cents)}</p>
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
                    </>
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

export function DebtsTab({
    active,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
    const [sub, setSub] = useState<SubTab>('Debts');
    const addRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (focus?.domain === 'debt') {
            setSub('Payments');
        }
    }, [focus]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} labels={ledgerCopy.debts.sub} />
                <AddButton onClick={() => addRef.current?.()} />
            </TabToolbar>
            {sub === 'Debts' && <DebtsListTab addRef={addRef} active={active} />}
            {sub === 'Payments' && (
                <PaymentsTab addRef={addRef} active={active} focus={focus} onFocusConsumed={onFocusConsumed} />
            )}
            {sub === 'Categories' && (
                <CategoryTab
                    active={active}
                    addRef={addRef}
                    listUrl="/api/v1/categories/debts"
                    storeUrl="/api/v1/categories/debts"
                    updateUrl={(id) => `/api/v1/categories/debts/${id}`}
                    deleteUrl={(id) => `/api/v1/categories/debts/${id}`}
                    emptyLabel={ledgerCopy.debts.noCategories}
                    deleteConfirmMessage={ledgerCopy.debts.deleteCategory}
                />
            )}
        </div>
    );
}
