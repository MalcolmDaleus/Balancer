/**
 * Shared UI primitives and re-exports for the Creator Suite.
 */
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Loader2 } from 'lucide-react';
import {
    Children,
    cloneElement,
    isValidElement,
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactElement,
    type ReactNode,
} from 'react';

// Domain types — live in @/types/api; re-export for back-compat
export type {
    Debt,
    DebtCategory,
    DebtPayment,
    IncomeEntry,
    Purchase,
    PurchaseCategory,
    RecurringCategory,
    RecurringEntry,
    RecurringStream,
    RegularIncomeSchedule,
    RegularIncomeScheduleVersion,
    Saving,
} from '@/types/api';

// API helpers — live in @/api/client; re-export for back-compat
export { apiFetch, apiFetchList, ApiClientError, errorMessage, unwrapData } from '@/api/client';

// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------

/** Row typography — use consistently across CS list items */
export const rowTitleCls = 'text-base font-medium leading-snug text-slate-900 dark:text-neutral-50';
export const rowDetailCls = 'text-sm leading-snug text-slate-500 dark:text-neutral-200';
export const rowAmountCls = 'shrink-0 text-lg font-semibold tabular-nums';

/** Translucent chip/tab tints — dark mode uses a lighter fill and brighter text */
export const tintChip = {
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    sky: 'bg-sky-500/15 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
    red: 'bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-400',
    rose: 'bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    amber: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    orange: 'bg-orange-400/15 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300',
    violet: 'bg-violet-500/15 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    teal: 'bg-teal-500/15 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300',
    slate: 'bg-slate-500/15 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300',
    feed: 'bg-slate-200 text-slate-800 dark:bg-neutral-600 dark:text-neutral-50',
} as const;

/** Balance sheet section header pills — slightly softer fill in dark mode */
export const tintSectionPill = {
    emerald: 'bg-emerald-300/25 text-emerald-600/80 dark:bg-emerald-400/10 dark:text-emerald-300',
    red: 'bg-red-300/25 text-red-600/80 dark:bg-red-500/25 dark:text-red-400',
    rose: 'bg-rose-300/25 text-rose-600/80 dark:bg-rose-400/10 dark:text-rose-300',
    yellow: 'bg-yellow-300/30 text-yellow-600/80 dark:bg-yellow-400/10 dark:text-yellow-300',
    orange: 'bg-orange-300/25 text-orange-600/80 dark:bg-orange-400/10 dark:text-orange-300',
    sky: 'bg-sky-300/25 text-sky-600/80 dark:bg-sky-400/10 dark:text-sky-300',
} as const;

/** Inactive tab label — readable on dark surfaces without a fill */
export const tabInactiveCls =
    'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-neutral-100';

/** Nested cards — downward lift, not a grey halo. Parent scroll area must pad so it isn’t clipped. */
export const innerCardCls =
    'rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_6px_16px_rgba(15,23,42,0.10)] dark:bg-neutral-800/50 dark:shadow-[0_2px_10px_rgba(0,0,0,0.40)]';

/** Filled grey — archive, secondary pills, Save Changes, confirm primary. */
export const greyBtnFillCls =
    'bg-slate-600 text-white hover:bg-slate-500 dark:bg-neutral-600 dark:hover:bg-neutral-500';

export const editBtnCls =
    'rounded-full bg-sky-700 px-3 py-1 text-sm font-medium text-sky-50 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40';
export const deleteBtnCls =
    'rounded-full bg-rose-700 px-3 py-1 text-sm font-medium text-rose-50 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40';
export const archiveBtnCls = `rounded-full px-3 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${greyBtnFillCls}`;
export const secondaryBtnCls = archiveBtnCls;
export const secondaryBtnFullCls = `${secondaryBtnCls} w-full text-center`;

/** Vertical stack for list items */
export function ListStack({ children }: { children: ReactNode }) {
    return <div className="space-y-2.5">{children}</div>;
}

/** Sub-tab row + Add button — aligns with card px-4 padding */
export function TabToolbar({ children }: { children: ReactNode }) {
    return <div className="mb-3 flex shrink-0 items-center justify-between gap-2">{children}</div>;
}

/** Card-style list row with generous padding */
export function ListRow({
    children,
    selected,
    onClick,
    disabled,
    busy = false,
    className = '',
}: {
    children: ReactNode;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    busy?: boolean;
    className?: string;
}) {
    const interactive = Boolean(onClick && !disabled && !busy);
    const baseCls = `relative overflow-hidden rounded-xl px-4 py-4 transition-colors text-left w-full ${
        busy
            ? 'cursor-wait'
            : disabled
              ? 'cursor-default opacity-70'
              : interactive
                ? 'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-neutral-800/50'
                : ''
    } ${
        selected ? 'bg-slate-100 ring-1 ring-slate-200 dark:bg-neutral-800/60 dark:ring-neutral-700' : 'bg-slate-50/70 dark:bg-neutral-800/40'
    } ${className}`;

    const onKeyDown = (e: KeyboardEvent) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

    const body = (
        <>
            {children}
            {busy && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[2px] dark:bg-neutral-950/60"
                    role="status"
                    aria-label="Removing"
                >
                    <Loader2 className="h-6 w-6 animate-spin text-violet-400/80 dark:text-violet-300/70" strokeWidth={2.25} />
                </div>
            )}
        </>
    );

    if (interactive) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={onKeyDown}
                className={baseCls}
                aria-busy={busy}
            >
                {body}
            </div>
        );
    }

    return (
        <div className={baseCls} aria-busy={busy}>
            {body}
        </div>
    );
}

/** Drop a row from a CS list after a successful delete/archive. */
export function dropById<T extends { id: number }>(id: number) {
    return (prev: T[]) => prev.filter((item) => item.id !== id);
}

/** Action buttons row — full width, wraps on narrow screens */
export function RowActionBar({ children }: { children: ReactNode }) {
    return <div className="mt-3 flex flex-wrap justify-end gap-2">{children}</div>;
}

/**
 * Inline "+ Add" button for mobile — sits next to the SubTabBar.
 * Hidden on desktop (form is always visible in the split pane).
 */
export function AddButton({ onClick, label = 'Add' }: { onClick: () => void; label?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:bg-emerald-700 active:scale-95 md:hidden dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
            + {label}
        </button>
    );
}

/** Secondary tab bar (pill style) used inside each main tab */
export function SubTabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
    return (
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5" role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active === tab}
                    onClick={() => onChange(tab)}
                    className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                        active === tab ? 'bg-slate-800 text-white dark:bg-white/10 dark:text-neutral-100' : tabInactiveCls
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}

export interface SplitPaneProps {
    list: ReactNode;
    form: ReactNode;
    /** Mobile sheet: is the form sheet open? */
    sheetOpen?: boolean;
    /** Mobile sheet: callback to change open state */
    onSheetOpenChange?: (open: boolean) => void;
    /** Mobile sheet: title shown in the sheet header */
    sheetTitle?: string;
}

/** Split pane: 60 % list + 40 % form on desktop; list-only + bottom sheet on mobile. */
export function SplitPane({ list, form, sheetOpen = false, onSheetOpenChange, sheetTitle }: SplitPaneProps) {
    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row" data-cs-split>
                {/* List panel — full width on mobile, 60 % on desktop */}
                <div className="flex min-h-0 flex-col md:w-[58%]">
                    <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
                </div>

                {/* Desktop form panel — hidden on mobile */}
                <div
                    data-cs-form-pane
                    className="hidden min-h-0 flex-col overflow-hidden border-l border-slate-100 pl-5 md:flex md:w-[42%] dark:border-neutral-800 dark:bg-neutral-950/40"
                >
                    {sheetTitle && (
                        <p className="mb-2 shrink-0 text-sm font-semibold text-slate-600 dark:text-neutral-300">
                            {sheetTitle}
                        </p>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">{form}</div>
                </div>
            </div>

            {/* Mobile bottom sheet */}
            <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
                <SheetContent side="bottom" className="rounded-t-2xl bg-white md:hidden dark:bg-neutral-900">
                    <div className="overflow-y-auto px-5 pt-6 pb-8">
                        {sheetTitle && <p className="mb-4 text-base font-semibold text-slate-800 dark:text-neutral-100">{sheetTitle}</p>}
                        {form}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

/** Status chip for debt/stream/category states */
export function StatusChip({ label, color }: { label: string; color: 'green' | 'blue' | 'red' | 'amber' | 'slate' | 'violet' | 'teal' }) {
    const map: Record<string, string> = {
        green: tintChip.emerald,
        blue: tintChip.sky,
        red: tintChip.rose,
        amber: tintChip.amber,
        slate: tintChip.slate,
        violet: tintChip.violet,
        teal: tintChip.teal,
    };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${map[color]}`}>{label}</span>;
}

/** Delete confirmation modal */
export function ConfirmModal({
    message,
    onConfirm,
    onCancel,
    confirmLabel = 'Delete',
    confirmVariant = 'danger',
}: {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
}) {
    const variantCls = {
        danger: 'bg-rose-500 hover:bg-rose-600',
        warning: 'bg-amber-500 hover:bg-amber-600',
        primary: greyBtnFillCls,
    }[confirmVariant];
    const dialogRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState(false);

    const confirm = () => {
        if (busy) return;
        setBusy(true);
        onConfirm();
    };

    useEffect(() => {
        const prev = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();
        const focusable = () =>
            dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );

        const onKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
                return;
            }
            const nodes = focusable();
            if (e.key !== 'Tab' || !nodes?.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            prev?.focus?.();
        };
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-describedby="confirm-modal-message"
                tabIndex={-1}
                className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-neutral-900"
            >
                <p id="confirm-modal-message" className="mb-5 text-base text-slate-700 dark:text-neutral-200">
                    {message}
                </p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button type="button" size="sm" className={`rounded-full text-white ${variantCls}`} onClick={confirm} disabled={busy}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Inline API error banner */
export function ApiError({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    return (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" role="alert">
            <span>{message}</span>
            {onDismiss && (
                <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="ml-2 shrink-0 opacity-60 hover:opacity-100">
                    ✕
                </button>
            )}
        </div>
    );
}

/** Form field row wrapper — wires label htmlFor to the first focusable child id */
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
    const autoId = useId();
    const child = Children.only(isValidElement(children) ? children : <span>{children}</span>);
    const existingId = isValidElement(child) && typeof (child.props as { id?: string }).id === 'string'
        ? (child.props as { id?: string }).id
        : undefined;
    const id = existingId ?? autoId;
    const labeled = isValidElement(child)
        ? cloneElement(child as ReactElement<{ id?: string }>, { id })
        : child;

    return (
        <div className="grid gap-1">
            <label htmlFor={id} className="text-sm font-medium text-slate-600 dark:text-neutral-300">
                {label}
            </label>
            {labeled}
            {error && <span className="text-sm text-rose-500">{error}</span>}
        </div>
    );
}

/** Shared input class */
export const inputCls =
    'flex h-8 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

/** Same as inputCls but width fits the content — use for date / month inputs */
export const dateCls =
    'flex h-8 w-auto justify-self-start rounded-md border border-slate-200 bg-white px-3 py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100';

/** Shared select class */
export const selectCls = inputCls;

/** Loading row */
export function LoadingRows() {
    return <Spinner className="min-h-20 py-4" label="Loading" />;
}

/** Empty row */
export function EmptyRows({ label }: { label?: string }) {
    return <p className="py-4 text-center text-sm text-slate-400">{label ?? 'No records found.'}</p>;
}

/** Row button set */
export function RowActions({
    onEdit,
    onDelete,
    editDisabled,
    deleteDisabled,
    extra,
    dangerLabel = 'Delete',
    dangerKind = 'delete',
}: {
    onEdit?: () => void;
    onDelete?: () => void;
    editDisabled?: boolean;
    deleteDisabled?: boolean;
    extra?: ReactNode;
    dangerLabel?: string;
    dangerKind?: 'delete' | 'archive';
}) {
    const dangerCls = dangerKind === 'archive' ? archiveBtnCls : deleteBtnCls;

    return (
        <div className="flex shrink-0 items-center gap-1">
            {extra}
            {onEdit && (
                <button
                    type="button"
                    disabled={editDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className={editBtnCls}
                >
                    Edit
                </button>
            )}
            {onDelete && (
                <button
                    type="button"
                    disabled={deleteDisabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className={dangerCls}
                >
                    {dangerLabel}
                </button>
            )}
        </div>
    );
}

/** Instrument row danger: red Delete when a hard delete is allowed, else grey Archive. */
export function instrumentDanger(canHardDelete: boolean | undefined): {
    dangerLabel: string;
    dangerKind: 'delete' | 'archive';
} {
    return canHardDelete
        ? { dangerLabel: 'Delete', dangerKind: 'delete' }
        : { dangerLabel: 'Archive', dangerKind: 'archive' };
}

export function instrumentRemoveConfirm(
    name: string,
    canHardDelete: boolean | undefined,
    archiveMessage: string,
): {
    message: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'warning';
} {
    return canHardDelete
        ? {
              message: `Permanently delete "${name}"? This cannot be undone.`,
              confirmLabel: 'Delete',
              confirmVariant: 'danger',
          }
        : {
              message: archiveMessage,
              confirmLabel: 'Archive',
              confirmVariant: 'warning',
          };
}

/** Utility: today's date as YYYY-MM-DD */
export const todayStr = () => new Date().toISOString().slice(0, 10);

/** Utility: current month as YYYY-MM */
export const thisMonthStr = () => new Date().toISOString().slice(0, 7);

/** Normalize a date (YYYY-MM-DD) or month (YYYY-MM) to YYYY-MM */
export function monthKey(dateOrMonth: string): string {
    return dateOrMonth.slice(0, 7);
}

/** Reusable "Save / Cancel" button row at the bottom of forms */
export function FormActions({
    isEdit,
    saving,
    onCancel,
    saveLabel,
    disabled,
}: {
    isEdit: boolean;
    saving: boolean;
    onCancel: () => void;
    saveLabel?: string;
    disabled?: boolean;
}) {
    const blocked = saving || disabled;
    return (
        <div className="flex gap-2 pt-1">
            <button
                type="submit"
                disabled={blocked}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    isEdit ? greyBtnFillCls : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
            >
                {saving ? 'Saving…' : (saveLabel ?? (isEdit ? 'Save Changes' : 'Add'))}
            </button>
            {isEdit && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}
