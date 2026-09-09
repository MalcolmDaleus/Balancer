import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Purchase, PurchaseCategory } from '@/types/api';
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
    RowActions,
    SplitPane,
    StatusChip,
    SubTabBar,
    TabToolbar,
    dropById,
    dateCls,
    inputCls,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
    selectCls,
    secondaryBtnCls,
    secondaryBtnFullCls,
    todayStr,
} from './shared';

type RefundStep = 'choose' | 'partial' | 'confirm-full' | 'confirm-payoff';

function RefundModal({
    purchase,
    saving,
    error,
    onClose,
    onConfirm,
}: {
    purchase: Purchase;
    saving: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (amount: number | null) => void;
}) {
    const fmt = useFormatMoney();
    const hasPartial = purchase.refund_status === 'partial';
    const remaining = purchase.remaining_refundable_cents;
    const refunded = purchase.refunded_cents;

    const [step, setStep] = useState<RefundStep>('choose');
    const [partialAmount, setPartialAmount] = useState('');

    const close = () => {
        if (!saving) onClose();
    };

    const title = purchase.description;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                {step === 'choose' && (
                    <>
                        <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-neutral-50">Refund</h3>
                        <p className="mb-4 text-sm text-slate-600 dark:text-neutral-200">{title}</p>
                        {hasPartial && (
                            <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-neutral-800/60 dark:text-neutral-200">
                                Refunded {fmt(refunded)} of {fmt(purchase.amount_cents)}
                                <span className="mt-0.5 block text-slate-500 dark:text-neutral-300">{fmt(remaining)} remaining</span>
                            </p>
                        )}
                        {error && (
                            <div className="mb-3">
                                <ApiError message={error} />
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            {hasPartial ? (
                                <Button type="button" className="w-full rounded-full" onClick={() => setStep('confirm-payoff')}>
                                    Pay off ({fmt(remaining)})
                                </Button>
                            ) : (
                                <Button type="button" className="w-full rounded-full" onClick={() => setStep('confirm-full')}>
                                    Full refund ({fmt(purchase.amount_cents)})
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-full"
                                onClick={() => {
                                    setPartialAmount('');
                                    setStep('partial');
                                }}
                            >
                                Partial refund
                            </Button>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={close}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}

                {step === 'partial' && (
                    <>
                        <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-neutral-50">Partial refund</h3>
                        <p className="mb-4 text-sm text-slate-600 dark:text-neutral-200">{title}</p>
                        {hasPartial && <p className="mb-3 text-sm text-slate-500 dark:text-neutral-300">Up to {fmt(remaining)} remaining</p>}
                        {error && (
                            <div className="mb-3">
                                <ApiError message={error} />
                            </div>
                        )}
                        <Field label="Amount">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={remaining / 100}
                                required
                                autoFocus
                                className={inputCls}
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                            />
                        </Field>
                        <div className="mt-5 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-full"
                                onClick={() => setStep('choose')}
                                disabled={saving}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className={`rounded-full ${secondaryBtnCls}`}
                                disabled={saving || !partialAmount || Number(partialAmount) <= 0}
                                onClick={() => onConfirm(majorInputToCents(partialAmount))}
                            >
                                {saving ? 'Saving…' : 'Confirm'}
                            </Button>
                        </div>
                    </>
                )}

                {(step === 'confirm-full' || step === 'confirm-payoff') && (
                    <>
                        <p className="mb-5 text-base text-slate-700 dark:text-neutral-200">
                            {step === 'confirm-full'
                                ? `Mark "${title}" as fully refunded? This will add a matching income entry of ${fmt(purchase.amount_cents)}.`
                                : `Refund the remaining ${fmt(remaining)} for "${title}"? This will fully refund the purchase.`}
                        </p>
                        {error && (
                            <div className="mb-3">
                                <ApiError message={error} />
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-full"
                                onClick={() => setStep('choose')}
                                disabled={saving}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className={`rounded-full ${secondaryBtnCls}`}
                                disabled={saving}
                                onClick={() => onConfirm(null)}
                            >
                                {saving ? 'Saving…' : 'Confirm'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-tab: Items
// ---------------------------------------------------------------------------

function ItemsTab({
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
    const isMobile = useIsMobile();
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [cats, setCats] = useState<PurchaseCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<Purchase | null>(null);
    const [confirm, setConfirm] = useState<Purchase | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [refundTarget, setRefundTarget] = useState<Purchase | null>(null);
    const [refundSaving, setRefundSaving] = useState(false);
    const [refundError, setRefundError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const blank = { category_id: '', description: '', amount: '', date: todayStr(), url: '' };
    const [form, setForm] = useState(blank);
    const [filter, setFilter] = useState<FactFilterValues>(blankFactFilter);

    const load = async () => {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([
                apiFetchList<Purchase>('/api/v1/purchases'),
                apiFetchList<PurchaseCategory>('/api/v1/categories/purchases'),
            ]);
            setPurchases(p);
            setCats(c.filter((c) => !c.deleted_at));
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

    const catName = (id: number) => cats.find((c) => c.id === id)?.name ?? '—';
    const visiblePurchases = useMemo(
        () =>
            purchases.filter((p) =>
                matchesFactFilter(
                    {
                        date: p.date,
                        amountCents: p.amount_cents,
                        text: `${p.description} ${cats.find((c) => c.id === p.category_id)?.name ?? ''}`,
                        categoryId: p.category_id,
                    },
                    filter,
                ),
            ),
        [purchases, filter, cats],
    );

    const selectRow = (p: Purchase) => {
        setSelected(p);
        setForm({
            category_id: String(p.category_id),
            description: p.description,
            amount: centsToInput(p.amount_cents),
            date: p.date,
            url: p.url ?? '',
        });
        setError(null);
        if (isMobile && canMutateFact(p.date)) setSheetOpen(true);
    };

    useEffect(() => {
        if (!focus || focus.domain !== 'spending') return;
        setFilter((f) => ({ ...f, ...monthRangeContaining(focus.occurredOn) }));
    }, [focus]);

    useEffect(() => {
        if (!focus || focus.domain !== 'spending' || !fetched) return;
        const p = purchases.find((row) => row.id === focus.sourceId);
        if (!p) return;
        selectRow(p);
        onFocusConsumed?.();
    }, [focus, fetched, purchases]);

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
        if (!canMutateFact(form.date)) {
            const msg = loaded ? 'This month is locked.' : 'Checking month locks…';
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const body = {
                category_id: Number(form.category_id),
                description: form.description,
                amount_cents: majorInputToCents(form.amount),
                date: form.date,
                url: form.url.trim() || null,
            };
            if (selected) {
                await apiFetch(`/api/v1/purchases/${selected.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body),
                    toast: 'Saved',
                });
            } else {
                await apiFetch('/api/v1/purchases', {
                    method: 'POST',
                    body: JSON.stringify(body),
                    toast: 'Purchase added',
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

    const handleDelete = async (p: Purchase) => {
        setConfirm(null);
        setRemovingId(p.id);
        try {
            await apiFetch(`/api/v1/purchases/${p.id}`, { method: 'DELETE', toast: 'Deleted' });
            setPurchases(dropById(p.id));
            if (selected?.id === p.id) reset();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const handleRefund = async (p: Purchase, amount: number | null) => {
        setRefundSaving(true);
        setRefundError(null);
        try {
            const body = amount !== null ? { amount_cents: amount } : {};
            await apiFetch(`/api/v1/purchases/${p.id}/refund`, {
                method: 'POST',
                body: JSON.stringify(body),
                toast: 'Refund recorded',
            });
            setRefundTarget(null);
            setFetched(false);
        } catch (err: unknown) {
            setRefundError(errorMessage(err));
        } finally {
            setRefundSaving(false);
        }
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
            <Field label="Category">
                <select
                    required
                    className={selectCls}
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                >
                    <option value="">— select —</option>
                    {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
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
            <Field label="Date">
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
            </Field>
            <Field label="Link (optional)">
                <input
                    type="url"
                    maxLength={500}
                    placeholder="https://…"
                    className={inputCls}
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} disabled={!canMutateFact(form.date)} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={`Delete purchase "${confirm.description}"? This cannot be undone if the month has passed.`}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            {refundTarget && (
                <RefundModal
                    key={refundTarget.id}
                    purchase={refundTarget}
                    saving={refundSaving}
                    error={refundError}
                    onClose={() => {
                        setRefundTarget(null);
                        setRefundError(null);
                    }}
                    onConfirm={(amount) => handleRefund(refundTarget, amount)}
                />
            )}
            <FactFilterBar
                value={filter}
                onChange={setFilter}
                categories={cats.map((c) => ({ id: c.id, name: c.name }))}
            />
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Purchase' : 'New Purchase'}
                list={
                    <ListStack>
                        {loading && !purchases.length && <LoadingRows />}
                        {!loading && !purchases.length && <EmptyRows label="No purchases yet." />}
                        {!loading && purchases.length > 0 && !visiblePurchases.length && (
                            <EmptyRows label="No purchases match these filters." />
                        )}
                        {visiblePurchases.map((p) => {
                            const fullyRefunded = p.refund_status === 'full' || p.is_refunded;
                            const partiallyRefunded = p.refund_status === 'partial';
                            const canWrite = canMutateFact(p.date);
                            const canEdit = !partiallyRefunded && canWrite;
                            const refundOnly = !canEdit && !partiallyRefunded;
                            return (
                                <ListRow key={p.id} selected={selected?.id === p.id} disabled={fullyRefunded} busy={removingId === p.id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{p.description}</p>
                                            <p className={`mt-1 ${rowAmountCls} text-rose-500 dark:text-rose-400`}>{fmtAmount(p.amount_cents)}</p>
                                            <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                                {p.date} · {catName(p.category_id)}
                                            </p>
                                        </div>
                                        {fullyRefunded ? (
                                            <StatusChip label="Refunded" color="blue" />
                                        ) : (
                                            <div
                                                className={`flex shrink-0 flex-col items-stretch gap-2.5 ${refundOnly ? 'self-center' : ''}`}
                                            >
                                                {partiallyRefunded && <StatusChip label="Partially Refunded" color="teal" />}
                                                {canEdit && <RowActions onEdit={() => selectRow(p)} onDelete={() => setConfirm(p)} />}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRefundError(null);
                                                        setRefundTarget(p);
                                                    }}
                                                    className={secondaryBtnFullCls}
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
// Main export
// ---------------------------------------------------------------------------

const SUBTABS = ['Items', 'Categories'] as const;
type SubTab = (typeof SUBTABS)[number];

export function PurchasesTab({
    active,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
    const [sub, setSub] = useState<SubTab>('Items');
    const addRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (focus?.domain === 'spending') {
            setSub('Items');
        }
    }, [focus]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                <AddButton onClick={() => addRef.current?.()} />
            </TabToolbar>
            {sub === 'Items' && (
                <ItemsTab addRef={addRef} active={active} focus={focus} onFocusConsumed={onFocusConsumed} />
            )}
            {sub === 'Categories' && (
                <CategoryTab
                    active={active}
                    addRef={addRef}
                    listUrl="/api/v1/categories/purchases"
                    storeUrl="/api/v1/categories/purchases"
                    updateUrl={(id) => `/api/v1/categories/purchases/${id}`}
                    deleteUrl={(id) => `/api/v1/categories/purchases/${id}`}
                    emptyLabel="No purchase categories."
                    deleteConfirmMessage={(name) =>
                        `Remove category "${name}"? It will be unlisted if purchases reference it.`
                    }
                />
            )}
        </div>
    );
}
