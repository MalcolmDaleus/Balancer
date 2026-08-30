import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type BugReportContextValue = {
    open: boolean;
    isDesktop: boolean;
    /** Mobile deep-link: scroll carousel to the bug report card once. */
    focusBugReportCard: boolean;
    openBugReport: () => void;
    closeBugReport: () => void;
    setOpen: (open: boolean) => void;
    clearFocusBugReportCard: () => void;
};

const BugReportContext = createContext<BugReportContextValue | null>(null);

const DESKTOP_MQ = '(min-width: 768px)';

function readBugsQuery(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return new URLSearchParams(window.location.search).has('bugs');
}

function clearBugsQuery(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has('bugs')) {
        return;
    }

    url.searchParams.delete('bugs');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
}

export function BugReportProvider({ children }: { children: ReactNode }) {
    const [open, setOpenState] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [focusBugReportCard, setFocusBugReportCard] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_MQ);
        const sync = () => setIsDesktop(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        if (!readBugsQuery()) {
            return;
        }

        clearBugsQuery();

        if (window.matchMedia(DESKTOP_MQ).matches) {
            setOpenState(true);
        } else {
            setFocusBugReportCard(true);
        }
    }, []);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        if (!next) {
            clearBugsQuery();
        }
    }, []);

    const openBugReport = useCallback(() => {
        if (window.matchMedia(DESKTOP_MQ).matches) {
            setOpen(true);
        } else {
            setFocusBugReportCard(true);
        }
    }, [setOpen]);

    const closeBugReport = useCallback(() => setOpen(false), [setOpen]);
    const clearFocusBugReportCard = useCallback(() => setFocusBugReportCard(false), []);

    const value = useMemo(
        () => ({
            open,
            isDesktop,
            focusBugReportCard,
            openBugReport,
            closeBugReport,
            setOpen,
            clearFocusBugReportCard,
        }),
        [open, isDesktop, focusBugReportCard, openBugReport, closeBugReport, setOpen, clearFocusBugReportCard],
    );

    return <BugReportContext.Provider value={value}>{children}</BugReportContext.Provider>;
}

export function useBugReport(): BugReportContextValue {
    const ctx = useContext(BugReportContext);
    if (!ctx) {
        throw new Error('useBugReport must be used within BugReportProvider');
    }

    return ctx;
}
