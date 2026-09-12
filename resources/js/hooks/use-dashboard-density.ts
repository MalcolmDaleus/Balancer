import { useCallback, useSyncExternalStore } from 'react';

/** Desktop bento density (card size and ratios only). Interior type stays the same. Mobile carousel is unchanged. */
export type DashboardDensity = 'comfortable' | 'compact';

const STORAGE_KEY = 'dashboard-density';

let current: DashboardDensity | null = null;
const listeners = new Set<() => void>();

function readStored(): DashboardDensity {
    if (typeof window === 'undefined') {
        return 'comfortable';
    }

    return localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : 'comfortable';
}

function getSnapshot(): DashboardDensity {
    if (current === null) {
        current = readStored();
    }

    return current;
}

function getServerSnapshot(): DashboardDensity {
    return 'comfortable';
}

function subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);

    return () => listeners.delete(onStoreChange);
}

function setDensity(next: DashboardDensity): void {
    current = next;
    localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
}

export function useDashboardDensity() {
    const density = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const updateDensity = useCallback((next: DashboardDensity) => setDensity(next), []);

    return { density, updateDensity, compact: density === 'compact' } as const;
}
