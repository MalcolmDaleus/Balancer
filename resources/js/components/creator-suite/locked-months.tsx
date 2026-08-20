import { apiFetch } from '@/api/client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { monthKey } from './shared';
import { useFinanceDataOptional } from '@/contexts/finance-data';

type LockedMonthsContextValue = {
    loaded: boolean;
    isLocked: (dateOrMonth: string) => boolean;
    /**
     * Pessimistic Fact write gate: blocked until locked-months fetch completes,
     * then blocked when the target month is locked.
     * Use for Facts (purchases, income entries, debt payments, savings, charges).
     * Instruments (schedules / streams / categories) stay editable.
     */
    canMutateFact: (dateOrMonth: string) => boolean;
    refresh: () => Promise<void>;
};

const LockedMonthsContext = createContext<LockedMonthsContextValue | null>(null);

export function LockedMonthsProvider({ children }: { children: ReactNode }) {
    const [locked, setLocked] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);
    const finance = useFinanceDataOptional();

    const refresh = useCallback(async () => {
        try {
            const res = await apiFetch<{ months: string[] }>('/api/v1/balance-sheet/locked-months');
            setLocked(new Set(res.months));
        } catch {
            setLocked(new Set());
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // Re-check locks after finance mutations (e.g. month close elsewhere)
    useEffect(() => {
        if (finance && finance.financeEpoch > 0) {
            void refresh();
        }
    }, [finance?.financeEpoch, refresh]);

    const isLocked = useCallback((dateOrMonth: string) => locked.has(monthKey(dateOrMonth)), [locked]);

    const canMutateFact = useCallback(
        (dateOrMonth: string) => loaded && !locked.has(monthKey(dateOrMonth)),
        [loaded, locked],
    );

    const value = useMemo(
        () => ({ loaded, isLocked, canMutateFact, refresh }),
        [loaded, isLocked, canMutateFact, refresh],
    );

    return <LockedMonthsContext.Provider value={value}>{children}</LockedMonthsContext.Provider>;
}

export function useLockedMonths(): LockedMonthsContextValue {
    const ctx = useContext(LockedMonthsContext);
    if (!ctx) {
        throw new Error('useLockedMonths must be used within LockedMonthsProvider');
    }
    return ctx;
}
