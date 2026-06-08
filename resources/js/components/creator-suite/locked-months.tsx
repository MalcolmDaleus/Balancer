import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, monthKey } from './shared';

type LockedMonthsContextValue = {
    loaded: boolean;
    isLocked: (dateOrMonth: string) => boolean;
    refresh: () => Promise<void>;
};

const LockedMonthsContext = createContext<LockedMonthsContextValue | null>(null);

export function LockedMonthsProvider({ children }: { children: ReactNode }) {
    const [locked, setLocked] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);

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

    const isLocked = useCallback(
        (dateOrMonth: string) => locked.has(monthKey(dateOrMonth)),
        [locked],
    );

    const value = useMemo(
        () => ({ loaded, isLocked, refresh }),
        [loaded, isLocked, refresh],
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
