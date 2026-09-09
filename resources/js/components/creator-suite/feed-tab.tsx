import { apiFetch, errorMessage } from '@/api/client';
import { majorInputToCents } from '@/lib/money';
import { useFormatMoney } from '@/hooks/use-format-money';
import type { LedgerFact, LedgerFeed } from '@/types/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { blankFactFilter, FactFilterBar, type FactFilterValues } from './fact-filters';
import { focusFromFact, type LedgerFocus } from './ledger-focus';
import { EmptyRows, ListRow, ListStack, LoadingRows, rowAmountCls, rowDetailCls, rowTitleCls, tintChip, tintSectionPill } from './shared';

const DOMAIN_LABEL: Record<LedgerFact['domain'], string> = {
    income: 'Income',
    spending: 'Purchase',
    recurring: 'Recurring',
    debt: 'Debt',
    savings: 'Savings',
};

const DOMAIN_CHIP: Record<LedgerFact['domain'], string> = {
    income: tintChip.emerald,
    spending: tintSectionPill.yellow,
    recurring: tintChip.orange,
    debt: tintChip.red,
    savings: tintChip.sky,
};

const DOMAIN_OPTIONS = [
    { value: 'spending', label: 'Purchases' },
    { value: 'income', label: 'Income' },
    { value: 'recurring', label: 'Recurring' },
    { value: 'debt', label: 'Debts' },
    { value: 'savings', label: 'Savings' },
];

export function FeedTab({
    active,
    onOpenFact,
}: {
    active: boolean;
    onOpenFact: (focus: LedgerFocus) => void;
}) {
    const fmt = useFormatMoney();
    const [filter, setFilter] = useState<FactFilterValues>(blankFactFilter);
    const [facts, setFacts] = useState<LedgerFact[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const query = useMemo(() => {
        const params = new URLSearchParams();
        if (filter.from) params.set('from', filter.from);
        if (filter.to) params.set('to', filter.to);
        if (filter.domain) params.set('domain', filter.domain);
        return params.toString();
    }, [filter.from, filter.to, filter.domain]);

    const visibleFacts = useMemo(
        () =>
            facts.filter((fact) => {
                const needle = filter.q.trim().toLowerCase();
                if (needle) {
                    const hay = `${fact.label ?? ''} ${fact.detail ?? ''} ${fact.classifier_name ?? ''}`.toLowerCase();
                    if (!hay.includes(needle)) {
                        return false;
                    }
                }
                const min = majorInputToCents(filter.amountMin);
                const max = majorInputToCents(filter.amountMax);
                if (filter.amountMin.trim() !== '' && min !== null && !Number.isNaN(min) && fact.amount_cents < min) {
                    return false;
                }
                if (filter.amountMax.trim() !== '' && max !== null && !Number.isNaN(max) && fact.amount_cents > max) {
                    return false;
                }
                return true;
            }),
        [facts, filter.q, filter.amountMin, filter.amountMax],
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const payload = await apiFetch<LedgerFeed>(`/api/v1/ledger/feed?${query}`);
            setFacts(payload.facts);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        if (active) {
            void load();
        }
    }, [active, load]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <FactFilterBar value={filter} onChange={setFilter} domains={DOMAIN_OPTIONS} />
            {error && <p className="mb-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <ListStack>
                    {loading && !facts.length && <LoadingRows />}
                    {!loading && !visibleFacts.length && <EmptyRows label="No facts in this range." />}
                    {visibleFacts.map((fact) => {
                        const signed = fact.direction === 'out' ? -fact.amount_cents : fact.amount_cents;
                        const title = fact.label?.trim() || DOMAIN_LABEL[fact.domain];
                        return (
                            <ListRow
                                key={`${fact.domain}-${fact.source_id}`}
                                onClick={() => onOpenFact(focusFromFact(fact))}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className={rowTitleCls}>{title}</p>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DOMAIN_CHIP[fact.domain]}`}
                                            >
                                                {DOMAIN_LABEL[fact.domain]}
                                            </span>
                                        </div>
                                        <p className={`mt-0.5 truncate ${rowDetailCls}`}>
                                            {fact.occurred_on}
                                            {fact.classifier_name ? ` · ${fact.classifier_name}` : ''}
                                            {fact.detail ? ` · ${fact.detail}` : ''}
                                        </p>
                                    </div>
                                    <span
                                        className={`${rowAmountCls} ${
                                            fact.direction === 'in'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-rose-500 dark:text-rose-400'
                                        }`}
                                    >
                                        {fmt(signed)}
                                    </span>
                                </div>
                            </ListRow>
                        );
                    })}
                </ListStack>
            </div>
        </div>
    );
}
