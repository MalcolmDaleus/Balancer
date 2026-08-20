export type { BalanceSheetExpanded, BalanceSheetSnapshot } from './api';

/** Format YYYY-MM as "Month Year" using the given locale (or browser default). */
export function formatMonthLabel(ym: string, locale?: string | null): string {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const resolved = locale || undefined;
    return date.toLocaleDateString(resolved, { month: 'long', year: 'numeric' });
}
