/**
 * Shared finance refresh context — Balance Sheet + Creator Suite stay in sync after mutations.
 */
import { setFinanceMutationListener } from '@/api/client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type FinanceDataContextValue = {
    /** Increments after successful mutating API calls (or explicit notify). */
    financeEpoch: number;
    notifyFinanceMutated: () => void;
};

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
    const [financeEpoch, setFinanceEpoch] = useState(0);

    const notifyFinanceMutated = useCallback(() => {
        setFinanceEpoch((n) => n + 1);
    }, []);

    useEffect(() => {
        setFinanceMutationListener(() => {
            setFinanceEpoch((n) => n + 1);
        });
        return () => setFinanceMutationListener(null);
    }, []);

    const value = useMemo(
        () => ({ financeEpoch, notifyFinanceMutated }),
        [financeEpoch, notifyFinanceMutated],
    );

    return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>;
}

export function useFinanceData(): FinanceDataContextValue {
    const ctx = useContext(FinanceDataContext);
    if (!ctx) {
        throw new Error('useFinanceData must be used within FinanceDataProvider');
    }
    return ctx;
}

/** Optional hook for components that may render outside the provider (tests / isolation). */
export function useFinanceDataOptional(): FinanceDataContextValue | null {
    return useContext(FinanceDataContext);
}
