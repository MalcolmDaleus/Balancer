import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type SettingsContextValue = {
    open: boolean;
    /** md+ viewport — drawer/gear only apply here. */
    isDesktop: boolean;
    /** Mobile deep-link: scroll carousel to the Settings card once. */
    focusSettingsCard: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    setOpen: (open: boolean) => void;
    clearFocusSettingsCard: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DESKTOP_MQ = '(min-width: 768px)';

function readSettingsQuery(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return new URLSearchParams(window.location.search).has('settings');
}

function clearSettingsQuery(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has('settings')) {
        return;
    }

    url.searchParams.delete('settings');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [open, setOpenState] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [focusSettingsCard, setFocusSettingsCard] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_MQ);
        const sync = () => setIsDesktop(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        if (!readSettingsQuery()) {
            return;
        }

        clearSettingsQuery();

        if (window.matchMedia(DESKTOP_MQ).matches) {
            setOpenState(true);
        } else {
            setFocusSettingsCard(true);
        }
    }, []);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        if (!next) {
            clearSettingsQuery();
        }
    }, []);

    const openSettings = useCallback(() => {
        if (window.matchMedia(DESKTOP_MQ).matches) {
            setOpen(true);
        } else {
            setFocusSettingsCard(true);
        }
    }, [setOpen]);

    const closeSettings = useCallback(() => setOpen(false), [setOpen]);
    const clearFocusSettingsCard = useCallback(() => setFocusSettingsCard(false), []);

    const value = useMemo(
        () => ({
            open,
            isDesktop,
            focusSettingsCard,
            openSettings,
            closeSettings,
            setOpen,
            clearFocusSettingsCard,
        }),
        [open, isDesktop, focusSettingsCard, openSettings, closeSettings, setOpen, clearFocusSettingsCard],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
    const ctx = useContext(SettingsContext);
    if (!ctx) {
        throw new Error('useSettings must be used within SettingsProvider');
    }

    return ctx;
}
