import { nextToastId, setToastListener, type ToastItem, type ToastKind } from '@/lib/toast';
import { AlertCircle, Check, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 4200;

const KIND_CLS: Record<ToastKind, string> = {
    success:
        'border-emerald-200 bg-white text-emerald-900 dark:border-emerald-900/60 dark:bg-neutral-900 dark:text-emerald-100',
    error: 'border-rose-200 bg-white text-rose-900 dark:border-rose-900/60 dark:bg-neutral-900 dark:text-rose-100',
    warning:
        'border-amber-200 bg-white text-amber-950 dark:border-amber-900/60 dark:bg-neutral-900 dark:text-amber-100',
};

const ICON_CLS: Record<ToastKind, string> = {
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
};

function KindIcon({ kind }: { kind: ToastKind }) {
    const cls = `h-4 w-4 shrink-0 ${ICON_CLS[kind]}`;
    if (kind === 'success') {
        return <Check className={cls} />;
    }
    if (kind === 'warning') {
        return <TriangleAlert className={cls} />;
    }
    return <AlertCircle className={cls} />;
}

export default function ToastHost() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timers = useRef(new Map<number, number>());

    const dismiss = (id: number) => {
        const t = timers.current.get(id);
        if (t) {
            window.clearTimeout(t);
            timers.current.delete(id);
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    useEffect(() => {
        setToastListener((incoming) => {
            const id = nextToastId();
            const item: ToastItem = { id, kind: incoming.kind, message: incoming.message };
            setItems((prev) => [...prev.slice(-2), item]);
            const handle = window.setTimeout(() => dismiss(id), DURATION_MS);
            timers.current.set(id, handle);
        });

        return () => {
            setToastListener(null);
            timers.current.forEach((handle) => window.clearTimeout(handle));
            timers.current.clear();
        };
    }, []);

    if (items.length === 0) {
        return null;
    }

    return (
        <div
            className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-3 md:bottom-6 md:items-end md:px-6"
            aria-live="polite"
            aria-relevant="additions"
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    role={item.kind === 'error' ? 'alert' : 'status'}
                    className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${KIND_CLS[item.kind]}`}
                >
                    <KindIcon kind={item.kind} />
                    <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
                    <button
                        type="button"
                        onClick={() => dismiss(item.id)}
                        className="rounded-full p-0.5 text-current/50 hover:text-current"
                        aria-label="Dismiss"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
