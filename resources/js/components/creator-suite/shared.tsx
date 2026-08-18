/**
 * Shared types, API helpers, and UI primitives for the Creator Suite.
 */
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatMoney } from '@/lib/money';
import { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types — matching Laravel API resource output shapes
// ---------------------------------------------------------------------------

export interface RegularIncomeScheduleVersion {
    id: number;
    regular_schedule_id: number;
    amount: number;
    frequency: string;
    day_of_month: number | null;
    day_of_week: number | null;
    anchor_date: string | null;
    start_date: string;
    end_date: string | null;
    active: boolean;
}
export interface RegularIncomeSchedule {
    id: number;
    name: string;
    description: string | null;
    /** Live balance-sheet state. Generation service may write this after pending flush. */
    active: boolean;
    /** Queued change for the next cycle occurrence. null = no change pending. */
    pending_active: boolean | null;
    deleted_at: string | null;
    versions?: RegularIncomeScheduleVersion[];
}
export interface IncomeEntry {
    id: number;
    type: 'regular' | 'irregular' | 'refund';
    name: string;
    description: string | null;
    amount: number;
    received_at: string;
    purchase_id: number | null;
    purchase_description?: string | null;
    regular_schedule_id: number | null;
    regular_schedule_version_id: number | null;
    regular_schedule?: RegularIncomeSchedule;
}

export interface PurchaseCategory {
    id: number;
    user_id?: number;
    name: string;
    deleted_at: string | null;
}
export interface Purchase {
    id: number;
    category_id: number;
    amount: number;
    description: string;
    date: string;
    is_refunded: boolean;
    refunded_total: number;
    remaining_refundable: number;
    refund_status: 'none' | 'partial' | 'full';
    attachment_path?: string | null;
    url?: string | null;
    category?: PurchaseCategory;
}

export interface DebtCategory {
    id: number;
    user_id?: number;
    name: string;
    deleted_at: string | null;
}
export interface Debt {
    id: number;
    category_id: number | null;
    amount: number;
    description: string;
    issue_date: string;
    settle_date: string | null;
    notes: string | null;
    remaining_balance: number;
    is_settled: boolean;
    is_forgiven: boolean;
    is_closed: boolean;
    category?: DebtCategory;
}
export interface DebtPayment {
    id: number;
    debt_id: number;
    amount: number;
    paid_at: string;
    notes: string | null;
}

export interface RecurringCategory {
    id: number;
    name: string;
    deleted_at: string | null;
}
export interface RecurringEntry {
    id: number;
    recurring_payment_stream_id: number;
    amount: number;
    frequency: string;
    day_of_month: number | null;
    day_of_week: number | null;
    start_date: string;
    end_date: string | null;
    active: boolean;
}
export interface RecurringStream {
    id: number;
    recurring_payment_category_id: number | null;
    name: string;
    description: string | null;
    /** Live balance-sheet state. Flushed from pending_active on next charge date. */
    active: boolean;
    /** Queued pause/resume for the next charge occurrence. null = no change pending. */
    pending_active: boolean | null;
    deleted_at: string | null;
    category?: RecurringCategory;
    entries?: RecurringEntry[];
}

export interface Saving {
    id: number;
    amount: number;
    type: 'deposit' | 'withdrawal';
    notes: string | null;
    month: string;
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options?.headers },
        credentials: 'same-origin',
    });

    if (res.status === 204) return undefined as T;

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Collect validation messages if present
        if (body?.details) {
            const msgs = Object.values(body.details as Record<string, string[]>)
                .flat()
                .join(' · ');
            throw new Error(msgs);
        }
        throw new Error(body?.message ?? `HTTP ${res.status}`);
    }

    return body as T;
}

// Unwrap Laravel resource collections { data: [...] }
export async function apiFetchList<T>(url: string): Promise<T[]> {
    const res = await apiFetch<{ data: T[] } | T[]>(url);
    return Array.isArray(res) ? res : (res as { data: T[] }).data;
}

// ---------------------------------------------------------------------------
// Currency formatter — thin wrapper around shared money helpers
// ---------------------------------------------------------------------------

/** @deprecated Prefer useFormatMoney() in components for user currency/locale. */
export function fmt(amount: number, currency = 'USD', locale?: string | null) {
    return formatMoney(amount, currency, locale);
}

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
    red: 'bg-red-500/15 text-red-700 dark:bg-red-400/10 dark:text-red-300',
    rose: 'bg-rose-500/15 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    amber: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    orange: 'bg-orange-400/15 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300',
    violet: 'bg-violet-500/15 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    teal:   'bg-teal-500/15 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300',
    slate:  'bg-slate-500/15 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300',
} as const;

/** Balance sheet section header pills — slightly softer fill in dark mode */
export const tintSectionPill = {
    emerald: 'bg-emerald-300/25 text-emerald-600/80 dark:bg-emerald-400/10 dark:text-emerald-300',
    red: 'bg-red-300/25 text-red-600/80 dark:bg-red-400/10 dark:text-red-300',
    rose: 'bg-rose-300/25 text-rose-600/80 dark:bg-rose-400/10 dark:text-rose-300',
    yellow: 'bg-yellow-300/30 text-yellow-600/80 dark:bg-yellow-400/10 dark:text-yellow-300',
    orange: 'bg-orange-300/25 text-orange-600/80 dark:bg-orange-400/10 dark:text-orange-300',
    sky: 'bg-sky-300/25 text-sky-600/80 dark:bg-sky-400/10 dark:text-sky-300',
} as const;

/** Inactive tab label — readable on dark surfaces without a fill */
export const tabInactiveCls =
    'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-neutral-100';

/** Opaque row action buttons — same look in light and dark mode */
export const editBtnCls =
    'rounded-full bg-sky-700 px-3 py-1 text-sm font-medium text-sky-50 hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40';
export const deleteBtnCls =
    'rounded-full bg-rose-700 px-3 py-1 text-sm font-medium text-rose-50 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40';
export const secondaryBtnCls =
    'rounded-full bg-violet-500 px-3 py-1 text-sm font-medium text-violet-50 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40';
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
    className = '',
}: {
    children: ReactNode;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const interactive = onClick && !disabled;
    return (
        <div
            onClick={interactive ? onClick : undefined}
            className={`rounded-xl px-3 py-3.5 transition-colors ${
                disabled ? 'cursor-default opacity-70' : interactive ? 'cursor-pointer hover:bg-slate-100/80 dark:hover:bg-neutral-800/50' : ''
            } ${
                selected ? 'bg-slate-100 ring-1 ring-slate-200 dark:bg-neutral-800/60 dark:ring-neutral-700' : 'bg-slate-50/70 dark:bg-neutral-800/40'
            } ${className}`}
        >
            {children}
        </div>
    );
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
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {tabs.map((tab) => (
                <button
                    key={tab}
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
            <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
                {/* List panel — full width on mobile, 60 % on desktop */}
                <div className="flex min-h-0 flex-col md:w-[60%]">
                    <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
                </div>

                {/* Desktop form panel — hidden on mobile */}
                <div className="hidden border-l border-slate-100 pl-4 md:block md:w-[40%] dark:border-neutral-800 dark:bg-neutral-950/40">
                    {sheetTitle && <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-neutral-300">{sheetTitle}</p>}
                    <div className="overflow-y-auto">{form}</div>
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
        primary: 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-500 dark:hover:bg-slate-400',
    }[confirmVariant];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                <p className="mb-5 text-base text-slate-700 dark:text-neutral-200">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" className={`rounded-full text-white ${variantCls}`} onClick={onConfirm}>
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
        <div className="flex items-start justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <span>{message}</span>
            {onDismiss && (
                <button onClick={onDismiss} className="ml-2 shrink-0 opacity-60 hover:opacity-100">
                    ✕
                </button>
            )}
        </div>
    );
}

/** Form field row wrapper */
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
    return (
        <div className="grid gap-1">
            <label className="text-sm font-medium text-slate-600 dark:text-neutral-300">{label}</label>
            {children}
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
    return <p className="py-4 text-center text-sm text-slate-400">Loading…</p>;
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
}: {
    onEdit?: () => void;
    onDelete?: () => void;
    editDisabled?: boolean;
    deleteDisabled?: boolean;
    extra?: ReactNode;
}) {
    return (
        <div className="flex shrink-0 items-center gap-1">
            {extra}
            {onEdit && (
                <button
                    disabled={editDisabled}
                    onClick={onEdit}
                    className={editBtnCls}
                >
                    Edit
                </button>
            )}
            {onDelete && (
                <button
                    disabled={deleteDisabled}
                    onClick={onDelete}
                    className={deleteBtnCls}
                >
                    Del
                </button>
            )}
        </div>
    );
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
export function FormActions({ isEdit, saving, onCancel, saveLabel }: { isEdit: boolean; saving: boolean; onCancel: () => void; saveLabel?: string }) {
    return (
        <div className="flex gap-2 pt-1">
            <button
                type="submit"
                disabled={saving}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    isEdit ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-500 dark:hover:bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
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
