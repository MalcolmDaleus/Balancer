/** Shared API response shapes used by the dashboard, history, and Creator Suite. */

export type BalanceSheetExpanded = {
    month: string;
    income: {
        total: number;
        by_type: {
            regular: {
                total: number;
                schedules: Array<{
                    regular_schedule_id: number | null;
                    name: string;
                    total: number;
                    entries: Array<{
                        id: number;
                        name: string;
                        description: string | null;
                        amount: number;
                        received_at: string;
                    }>;
                }>;
            };
            irregular: { total: number };
            refund: { total: number };
        };
    };
    debt: {
        total: number;
        balance_total: number;
        debts: Array<{
            id: number;
            description: string;
            total_paid_in_period: number;
            remaining_balance: number;
            is_settled: boolean;
            is_forgiven: boolean;
        }>;
    };
    spending: {
        total: number;
        categories: Array<{
            category_name: string;
            amount: number;
            items: Array<{ id: number; description: string; amount: number; date: string }>;
        }>;
    };
    recurring_payments: {
        total: number;
        charged_total?: number;
        projected_total?: number;
        streams: Array<{
            stream_id: number;
            stream_name: string;
            category_name: string;
            total: number;
            entries: Array<{
                id: number;
                purchase_id?: number;
                amount: number;
                frequency: string;
                day_of_month: number | null;
                day_of_week: number | null;
                occurrence_count: number;
                period_total: number;
                charged_date?: string;
            }>;
        }>;
        projected?: Array<{
            stream_id: number;
            stream_name: string;
            category_name: string;
            total: number;
            entries: Array<{
                id: number;
                amount: number;
                frequency: string;
                day_of_month: number | null;
                day_of_week: number | null;
                occurrence_count: number;
                period_total: number;
                charged_date?: string;
            }>;
        }>;
    };
    savings: {
        monthly_total: number;
        monthly_deposits: number;
        monthly_withdrawals: number;
        grand_total: number;
        rows: Array<{ id: number; amount: number; type: 'deposit' | 'withdrawal'; notes: string | null; month: string }>;
    };
    roll_over: {
        total: number;
    };
};

export type BalanceSheetSnapshot = {
    id: number;
    month: string;
    total_income: number;
    total_debt_paid: number;
    total_spending: number;
    total_recurring: number;
    savings_snapshot: number;
    roll_over: number;
};

// ---------------------------------------------------------------------------
// Creator Suite domain types (Laravel API resource shapes)
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
    /** True when month-lock / fact rules allow a permanent delete. */
    can_hard_delete: boolean;
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
    name: string;
    user_id?: number;
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
    name: string;
    deleted_at?: string | null;
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
    /** True when there are no payments, the issue month is open, and the debt is not closed. */
    can_hard_delete: boolean;
    /** True when the debt is settled or forgiven (open debts cannot be archived). */
    can_archive: boolean;
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
    /** True when month-lock / fact rules allow a permanent delete. */
    can_hard_delete: boolean;
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

export type StatisticsView = 'trend' | 'compare' | 'share';
export type StatisticsWindow = 1 | 3 | 6 | 12 | 24 | 60 | 'all';
export type StatisticsUnit = 'money' | 'percent';

export interface StatisticsPoint {
    month?: string;
    name?: string;
    value: number;
}

export interface StatisticsSeries {
    view: StatisticsView;
    series: string;
    label: string;
    window: StatisticsWindow;
    from: string;
    to: string;
    unit: StatisticsUnit;
    span_months: number;
    available_windows: StatisticsWindow[];
    points: StatisticsPoint[];
}

export interface StatisticsMarker {
    id: string;
    label: string;
    value: number;
    unit: StatisticsUnit;
    baseline?: number;
    delta?: number;
    name?: string | null;
    month?: string | null;
}

export interface StatisticsMarkers {
    window: StatisticsWindow;
    from: string;
    to: string;
    span_months: number;
    available_windows: StatisticsWindow[];
    markers: StatisticsMarker[];
}

export type BugReportType = 'visual' | 'functional' | 'composite';
export type BugReportZone =
    | 'balance-sheet'
    | 'creator-suite'
    | 'statistics'
    | 'past-balance-sheets'
    | 'settings'
    | 'dashboard'
    | 'login'
    | 'other';
export type BugReportView = 'desktop' | 'mobile';

export interface BugReport {
    id: number;
    type: BugReportType;
    zone: BugReportZone;
    view: BugReportView;
    description: string;
    created_at: string;
}
