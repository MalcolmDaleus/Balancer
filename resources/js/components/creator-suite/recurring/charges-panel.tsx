import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { ledgerCopy } from '@/config/ledger-copy';
import { centsToInput, majorInputToCents } from '@/lib/money';
import { toastError } from '@/lib/toast';
import { useFormatMoney } from '@/hooks/use-format-money';
import type { RecurringCharge } from '@/types/api';
import { useEffect, useMemo, useState } from 'react';
import { blankFactFilter, FactFilterBar, matchesFactFilter, monthRangeContaining, type FactFilterValues } from '../fact-filters';
import type { LedgerFocus } from '../ledger-focus';
import { useLockedMonths } from '../locked-months';
import { fmtDate } from '../schedule-primitives';
import {
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    inputCls,
    ListRow,
    ListStack,
    LoadingRows,
    RowActions,
    SplitPane,
    dropById,
    rowAmountCls,
    rowDetailCls,
    rowTitleCls,
} from '../shared';

export function RecurringChargesPanel({
    active,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
    const fmtAmount = useFormatMoney();
    const { canMutateFact, loaded } = useLockedMonths();
    const [charges, setCharges] = useState<RecurringCharge[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<RecurringCharge | null>(null);
    const [confirm, setConfirm] = useState<RecurringCharge | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [filter, setFilter] = useState<FactFilterValues>(blankFactFilter);

    const formWritable = selected ? canMutateFact(selected.occurred_on) : false;

    const load = async () => {
        setLoading(true);
        try {
            setCharges(await apiFetchList<RecurringCharge>('/api/v1/recurring-payments/charges'));
            setFetched(true);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) void load();
    }, [active, fetched]);

    const allHaveCategory = charges.length > 0 && charges.every((c) => c.recurring_payment_category_id != null);
    const categoryOptions = useMemo(() => {
        if (!allHaveCategory) return undefined;
        const seen = new Map<number, string>();
        for (const charge of charges) {
            if (charge.recurring_payment_category_id != null) {
                seen.set(
                    charge.recurring_payment_category_id,
                    charge.category_name ?? ledgerCopy.recurring.fallbackCategory(charge.recurring_payment_category_id),
                );
            }
        }
        return [...seen.entries()].map(([id, name]) => ({ id, name }));
    }, [charges, allHaveCategory]);

    const visibleCharges = useMemo(
        () =>
            charges.filter((charge) =>
                matchesFactFilter(
                    {
                        date: charge.occurred_on,
                        amountCents: charge.amount_cents,
                        text: `${charge.stream_name} ${charge.category_name ?? ''}`,
                        categoryId: charge.recurring_payment_category_id,
                    },
                    filter,
                ),
            ),
        [charges, filter],
    );

    const selectRow = (charge: RecurringCharge) => {
        setSelected(charge);
        setAmount(centsToInput(charge.amount_cents));
        setError(null);
        setSheetOpen(true);
    };

    useEffect(() => {
        if (!focus || focus.domain !== 'recurring') return;
        setFilter((f) => ({ ...f, ...monthRangeContaining(focus.occurredOn) }));
    }, [focus]);

    useEffect(() => {
        if (!focus || focus.domain !== 'recurring' || !fetched) return;
        const charge = charges.find((row) => row.id === focus.sourceId);
        if (!charge) return;
        selectRow(charge);
        onFocusConsumed?.();
    }, [focus, fetched, charges]);

    const reset = () => {
        setSelected(null);
        setAmount('');
        setError(null);
        setSheetOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        if (!canMutateFact(selected.occurred_on)) {
            const msg = loaded ? ledgerCopy.common.monthLocked : ledgerCopy.common.checkingLocks;
            setError(msg);
            toastError(msg);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await apiFetch(`/api/v1/recurring-payments/charges/${selected.id}`, {
                method: 'PUT',
                body: JSON.stringify({ amount_cents: majorInputToCents(amount) }),
                toast: ledgerCopy.common.saved,
            });
            reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (charge: RecurringCharge) => {
        setConfirm(null);
        setRemovingId(charge.id);
        try {
            await apiFetch(`/api/v1/recurring-payments/charges/${charge.id}`, {
                method: 'DELETE',
                toast: ledgerCopy.recurring.occurrenceSkipped,
            });
            setCharges(dropById(charge.id));
            if (selected?.id === charge.id) reset();
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            {!selected && (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                    {ledgerCopy.recurring.chargesHint}
                </p>
            )}
            {selected && (
                <>
                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                        {ledgerCopy.recurring.chargeHint}
                    </p>
                    <Field label={ledgerCopy.recurring.stream}>
                        <input type="text" className={inputCls} value={selected.stream_name} disabled />
                    </Field>
                    <Field label={ledgerCopy.common.category}>
                        <input type="text" className={inputCls} value={selected.category_name ?? ledgerCopy.common.none} disabled />
                    </Field>
                    <Field label={ledgerCopy.common.amount}>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            className={inputCls}
                            value={amount}
                            disabled={!formWritable}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </Field>
                    <Field label={ledgerCopy.recurring.chargedOn}>
                        <input type="date" className={inputCls} value={selected.occurred_on.slice(0, 10)} disabled />
                    </Field>
                    <FormActions isEdit saving={saving} onCancel={reset} disabled={!formWritable} />
                </>
            )}
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={ledgerCopy.recurring.skipConfirm(confirm.stream_name, fmtDate(confirm.occurred_on), fmtAmount(confirm.amount_cents))}
                    confirmLabel={ledgerCopy.common.skip}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <FactFilterBar
                value={filter}
                onChange={setFilter}
                categories={categoryOptions}
            />
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                onDismiss={reset}
                sheetTitle={selected ? ledgerCopy.recurring.charge : ledgerCopy.recurring.charges}
                list={
                    <ListStack>
                        {loading && !charges.length && <LoadingRows />}
                        {!loading && !charges.length && <EmptyRows label={ledgerCopy.recurring.noCharges} />}
                        {!loading && charges.length > 0 && !visibleCharges.length && (
                            <EmptyRows label={ledgerCopy.recurring.noChargesMatch} />
                        )}
                        {visibleCharges.map((charge) => {
                            const canWrite = canMutateFact(charge.occurred_on);
                            return (
                                <ListRow
                                    key={charge.id}
                                    selected={selected?.id === charge.id}
                                    busy={removingId === charge.id}
                                    onClick={() => selectRow(charge)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className={rowTitleCls}>{charge.stream_name}</p>
                                            {charge.category_name && (
                                                <p className={`mt-0.5 truncate ${rowDetailCls}`}>{charge.category_name}</p>
                                            )}
                                        </div>
                                        <span className={`${rowAmountCls} text-rose-500 dark:text-rose-400`}>
                                            {fmtAmount(charge.amount_cents)}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className={rowDetailCls}>{fmtDate(charge.occurred_on)}</span>
                                        {canWrite && (
                                            <RowActions
                                                onEdit={() => selectRow(charge)}
                                                onDelete={() => setConfirm(charge)}
                                                dangerLabel={ledgerCopy.common.skip}
                                            />
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
