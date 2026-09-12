import { ledgerCopy } from '@/config/ledger-copy';
import { majorInputToCents } from '@/lib/money';
import { useMemo, useState } from 'react';
import { inputCls, selectCls } from './shared';

function DateFilterField({
    label,
    ariaLabel,
    value,
    onChange,
}: {
    label: string;
    ariaLabel: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className={`${inputCls} items-center gap-2`}>
            <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</span>
            <input
                type="date"
                aria-label={ariaLabel}
                className="cs-date-input min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit shadow-none outline-none focus:ring-0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

export type FactFilterValues = {
    q: string;
    from: string;
    to: string;
    amountMin: string;
    amountMax: string;
    categoryId: string;
    domain: string;
};

export function monthRangeFor(date = new Date()): { from: string; to: string } {
    const y = date.getFullYear();
    const m = date.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const last = new Date(y, m + 1, 0).getDate();
    return {
        from: `${y}-${pad(m + 1)}-01`,
        to: `${y}-${pad(m + 1)}-${pad(last)}`,
    };
}

export function monthRangeContaining(isoDate: string): { from: string; to: string } {
    const [y, m] = isoDate.split('-').map(Number);
    if (!y || !m) {
        return monthRangeFor();
    }
    return monthRangeFor(new Date(y, m - 1, 1));
}

export function blankFactFilter(): FactFilterValues {
    return { q: '', ...monthRangeFor(), amountMin: '', amountMax: '', categoryId: '', domain: '' };
}

export function matchesFactFilter(
    row: { date: string; amountCents: number; text: string; categoryId?: number | null },
    filter: FactFilterValues,
    locale?: string | null,
): boolean {
    const day = row.date.slice(0, 10);
    if (filter.from && day < filter.from) {
        return false;
    }
    if (filter.to && day > filter.to) {
        return false;
    }
    const needle = filter.q.trim().toLowerCase();
    if (needle && !row.text.toLowerCase().includes(needle)) {
        return false;
    }
    if (filter.amountMin.trim() !== '') {
        const min = majorInputToCents(filter.amountMin, locale);
        if (min !== null && !Number.isNaN(min) && row.amountCents < min) {
            return false;
        }
    }
    if (filter.amountMax.trim() !== '') {
        const max = majorInputToCents(filter.amountMax, locale);
        if (max !== null && !Number.isNaN(max) && row.amountCents > max) {
            return false;
        }
    }
    if (filter.categoryId && String(row.categoryId ?? '') !== filter.categoryId) {
        return false;
    }
    return true;
}

export function FactFilterBar({
    value,
    onChange,
    domains,
    categories,
}: {
    value: FactFilterValues;
    onChange: (next: FactFilterValues) => void;
    domains?: Array<{ value: string; label: string }>;
    categories?: Array<{ id: number; name: string }>;
}) {
    const set = (patch: Partial<FactFilterValues>) => onChange({ ...value, ...patch });
    const [moreOpen, setMoreOpen] = useState(false);
    const monthValue = value.from.slice(0, 7);
    const hasExtraFilters = useMemo(
        () =>
            Boolean(
                value.domain ||
                    value.categoryId ||
                    value.amountMin.trim() ||
                    value.amountMax.trim() ||
                    (value.from && value.to && monthRangeContaining(value.from).to !== value.to),
            ),
        [value.amountMax, value.amountMin, value.categoryId, value.domain, value.from, value.to],
    );

    const setMonth = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        if (!y || !m) {
            return;
        }
        onChange({ ...value, ...monthRangeFor(new Date(y, m - 1, 1)) });
    };

    return (
        <div className="mb-3 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                    type="search"
                    className={`${inputCls} col-span-2`}
                    placeholder={ledgerCopy.filters.search}
                    value={value.q}
                    onChange={(e) => set({ q: e.target.value })}
                />
                <label className={`${inputCls} items-center gap-2`}>
                    <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-neutral-400">
                        {ledgerCopy.filters.month}
                    </span>
                    <input
                        type="month"
                        aria-label={ledgerCopy.filters.month}
                        className="cs-date-input min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit shadow-none outline-none focus:ring-0"
                        value={monthValue}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </label>
                <button
                    type="button"
                    onClick={() => setMoreOpen((open) => !open)}
                    className={`${inputCls} items-center justify-center text-sm font-medium text-slate-600 dark:text-neutral-300`}
                    aria-expanded={moreOpen}
                >
                    {moreOpen ? ledgerCopy.filters.fewerFilters : ledgerCopy.filters.moreFilters}
                    {hasExtraFilters && !moreOpen ? ' •' : ''}
                </button>
            </div>
            {moreOpen && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <DateFilterField
                        label={ledgerCopy.filters.fromShort}
                        ariaLabel={ledgerCopy.filters.from}
                        value={value.from}
                        onChange={(from) => set({ from })}
                    />
                    <DateFilterField
                        label={ledgerCopy.filters.toShort}
                        ariaLabel={ledgerCopy.filters.to}
                        value={value.to}
                        onChange={(to) => set({ to })}
                    />
                    {domains && (
                        <select
                            className={selectCls}
                            aria-label={ledgerCopy.filters.domain}
                            value={value.domain}
                            onChange={(e) => set({ domain: e.target.value })}
                        >
                            <option value="">{ledgerCopy.filters.allTypes}</option>
                            {domains.map((d) => (
                                <option key={d.value} value={d.value}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <input
                        inputMode="decimal"
                        className={inputCls}
                        placeholder={ledgerCopy.filters.minAmount}
                        value={value.amountMin}
                        onChange={(e) => set({ amountMin: e.target.value })}
                    />
                    <input
                        inputMode="decimal"
                        className={inputCls}
                        placeholder={ledgerCopy.filters.maxAmount}
                        value={value.amountMax}
                        onChange={(e) => set({ amountMax: e.target.value })}
                    />
                    {categories && categories.length > 0 && (
                        <select
                            className={`${selectCls} col-span-2`}
                            aria-label={ledgerCopy.filters.category}
                            value={value.categoryId}
                            onChange={(e) => set({ categoryId: e.target.value })}
                        >
                            <option value="">{ledgerCopy.filters.allCategories}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
}
