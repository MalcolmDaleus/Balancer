/**
 * Shared types, API helpers, and UI primitives for the Creator Suite.
 */
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ReactNode, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types — matching Laravel API resource output shapes
// ---------------------------------------------------------------------------

export interface IncomeCategory {
    id: number;
    category_name: string;
}
export interface IncomeStream {
    id: number;
    category_id: number | null;
    name: string;
    description: string | null;
    is_system: boolean;
    deleted_at?: string | null;
    category?: IncomeCategory;
}
export interface IncomeEntry {
    id: number;
    income_stream_id: number;
    amount: number;
    month: string;
    purchase_id: number | null;
    stream?: IncomeStream;
}

export interface PurchaseCategory {
    id: number;
    category_name: string;
    deleted_at: string | null;
}
export interface Purchase {
    id: number;
    category_id: number;
    amount: number;
    description: string;
    date: string;
    is_refunded: boolean;
    attachment_path?: string | null;
    url?: string | null;
    category?: PurchaseCategory;
}

export interface DebtCategory {
    id: number;
    category_name: string;
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
// Currency formatter (no user context needed here — just bare numbers)
// ---------------------------------------------------------------------------

export function fmt(amount: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------

/** Secondary tab bar (pill style) used inside each main tab */
export function SubTabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
    return (
        <div className="flex gap-1 border-b border-slate-100 pb-2 dark:border-slate-700">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onChange(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active === tab
                            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}

/** Returns true when the viewport is narrower than the md breakpoint (768 px). */
export function useIsMobile(): boolean {
    const [mobile, setMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
        setMobile(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return mobile;
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
    /** Mobile sheet: clicking Add button calls this, then opens sheet */
    onAddClick?: () => void;
    /** Label for the mobile Add button (default "Add") */
    addLabel?: string;
}

/** Split pane: 60 % list + 40 % form on desktop; list-only + bottom sheet on mobile. */
export function SplitPane({
    list,
    form,
    sheetOpen = false,
    onSheetOpenChange,
    sheetTitle,
    onAddClick,
    addLabel = 'Add',
}: SplitPaneProps) {
    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
                {/* List panel — full width on mobile, 60 % on desktop */}
                <div className="flex min-h-0 flex-col md:w-[60%]">
                    {onAddClick && (
                        <div className="mb-3 flex justify-end md:hidden">
                            <button
                                onClick={onAddClick}
                                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                            >
                                + {addLabel}
                            </button>
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">{list}</div>
                </div>

                {/* Desktop form panel — hidden on mobile */}
                <div className="hidden border-l border-slate-100 pl-4 dark:border-slate-700 md:block md:w-[40%]">
                    {sheetTitle && (
                        <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-400">{sheetTitle}</p>
                    )}
                    <div className="overflow-y-auto">{form}</div>
                </div>
            </div>

            {/* Mobile bottom sheet */}
            <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
                <SheetContent
                    side="bottom"
                    className="rounded-t-2xl bg-white dark:bg-slate-800 md:hidden"
                >
                    <div className="overflow-y-auto px-5 pb-8 pt-6">
                        {sheetTitle && (
                            <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {sheetTitle}
                            </p>
                        )}
                        {form}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

/** Status chip for debt/stream/category states */
export function StatusChip({ label, color }: { label: string; color: 'green' | 'blue' | 'red' | 'amber' | 'slate' | 'violet' }) {
    const map: Record<string, string> = {
        green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-50',
        blue:   'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-50',
        red:    'bg-rose-100 text-rose-700 dark:bg-rose-700 dark:text-rose-50',
        amber:  'bg-amber-100 text-amber-700 dark:bg-amber-600 dark:text-amber-50',
        slate:  'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-100',
        violet: 'bg-violet-100 text-violet-700 dark:bg-violet-700 dark:text-violet-50',
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${map[color]}`}>{label}</span>;
}

/** Delete confirmation modal */
export function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                <p className="mb-5 text-sm text-slate-700 dark:text-slate-200">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" className="rounded-full bg-rose-500 text-white hover:bg-rose-600" onClick={onConfirm}>
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Inline API error banner */
export function ApiError({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
    return (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
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
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
            {children}
            {error && <span className="text-[11px] text-rose-500">{error}</span>}
        </div>
    );
}

/** Shared input class */
export const inputCls =
    'flex h-8 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/** Same as inputCls but width fits the content — use for date / month inputs */
export const dateCls =
    'flex h-8 w-auto justify-self-start rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/** Shared select class */
export const selectCls = inputCls;

/** Loading row */
export function LoadingRows() {
    return <p className="py-4 text-center text-xs text-slate-400">Loading…</p>;
}

/** Empty row */
export function EmptyRows({ label }: { label?: string }) {
    return <p className="py-4 text-center text-xs text-slate-400">{label ?? 'No records found.'}</p>;
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
                    className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-700 dark:text-sky-50 dark:hover:bg-sky-600"
                >
                    Edit
                </button>
            )}
            {onDelete && (
                <button
                    disabled={deleteDisabled}
                    onClick={onDelete}
                    className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-500 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-700 dark:text-rose-50 dark:hover:bg-rose-600"
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

/** Reusable "Save / Cancel" button row at the bottom of forms */
export function FormActions({ isEdit, saving, onCancel, saveLabel }: { isEdit: boolean; saving: boolean; onCancel: () => void; saveLabel?: string }) {
    return (
        <div className="flex gap-2 pt-1">
            <button
                type="submit"
                disabled={saving}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
                    isEdit ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-500 dark:hover:bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
            >
                {saving ? 'Saving…' : (saveLabel ?? (isEdit ? 'Save Changes' : 'Add'))}
            </button>
            {isEdit && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}
