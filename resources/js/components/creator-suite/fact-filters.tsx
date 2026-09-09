import { majorInputToCents } from '@/lib/money';
import { dateCls, inputCls, selectCls } from './shared';

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

    return (
        <div className="mb-3 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <input
                type="search"
                className={`${inputCls} col-span-2`}
                placeholder="Search name or notes"
                value={value.q}
                onChange={(e) => set({ q: e.target.value })}
            />
            <input
                type="date"
                className={dateCls}
                aria-label="From date"
                value={value.from}
                onChange={(e) => set({ from: e.target.value })}
            />
            <input
                type="date"
                className={dateCls}
                aria-label="To date"
                value={value.to}
                onChange={(e) => set({ to: e.target.value })}
            />
            {domains && (
                <select
                    className={selectCls}
                    aria-label="Domain"
                    value={value.domain}
                    onChange={(e) => set({ domain: e.target.value })}
                >
                    <option value="">All types</option>
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
                placeholder="Min amount"
                value={value.amountMin}
                onChange={(e) => set({ amountMin: e.target.value })}
            />
            <input
                inputMode="decimal"
                className={inputCls}
                placeholder="Max amount"
                value={value.amountMax}
                onChange={(e) => set({ amountMax: e.target.value })}
            />
            {categories && categories.length > 0 && (
                <select
                    className={`${selectCls} col-span-2`}
                    aria-label="Category"
                    value={value.categoryId}
                    onChange={(e) => set({ categoryId: e.target.value })}
                >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                            {c.name}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
