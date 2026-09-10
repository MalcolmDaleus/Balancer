export type BudgetEnvelope = {
    category_id: number;
    name: string;
    plan_cents: number;
    actual_cents: number;
    left_cents: number;
    has_cap: boolean;
};

export type BudgetMoneyBlock = {
    plan_cents: number;
    actual_cents: number;
    left_cents: number;
};

export type BudgetBillsStream = {
    name: string;
    charged_cents: number;
    remaining_cents: number;
};

export type BudgetRead = {
    month: string;
    is_locked: boolean;
    has_plan: boolean;
    days_left: number;
    discretionary: BudgetMoneyBlock;
    categories: BudgetEnvelope[];
    unallocated: BudgetMoneyBlock | null;
    bills: {
        auto: boolean;
        plan_cents: number;
        charged_cents: number;
        projected_cents: number;
        streams: BudgetBillsStream[];
    };
    debts: {
        remaining_cents: number;
        plan_cents: number | null;
        paid_cents: number;
        open: Array<{
            id: number;
            name: string;
            remaining_cents: number;
            original_cents: number;
            paid_this_month_cents: number;
        }>;
    };
    save: BudgetMoneyBlock | null;
    purchase_categories: Array<{ id: number; name: string; actual_cents: number }>;
    savings_this_month_cents: number;
};

export type BalanceSheetExpanded = {
    month: string;
    income: {
        total_cents: number;
        by_type: {
            regular: {
                total_cents: number;
                schedules: Array<{
                    regular_schedule_id: number | null;
                    name: string;
                    total_cents: number;
                    entries: Array<{
                        id: number;
                        name: string;
                        description: string | null;
                        amount_cents: number;
                        received_at: string;
                    }>;
                }>;
            };
            irregular: { total_cents: number };
            refund: { total_cents: number };
        };
    };
    debt: {
        total_cents: number;
        balance_total_cents: number;
        debts: Array<{
            id: number;
            description: string;
            total_paid_in_period_cents: number;
            remaining_cents: number;
            is_settled: boolean;
            is_forgiven: boolean;
        }>;
    };
    spending: {
        total_cents: number;
        categories: Array<{
            category_name: string;
            amount_cents: number;
            items: Array<{ id: number; description: string; amount_cents: number; date: string }>;
        }>;
    };
    recurring_payments: {
        total_cents: number;
        charged_total_cents?: number;
        projected_total_cents?: number;
        streams: Array<{
            stream_id: number;
            stream_name: string;
            category_name: string;
            total_cents: number;
            entries: Array<{
                id: number;
                purchase_id?: number;
                amount_cents: number;
                frequency: string;
                day_of_month: number | null;
                day_of_week: number | null;
                occurrence_count: number;
                period_total_cents: number;
                charged_date?: string;
            }>;
        }>;
        projected?: Array<{
            stream_id: number;
            stream_name: string;
            category_name: string;
            total_cents: number;
            entries: Array<{
                id: number;
                amount_cents: number;
                frequency: string;
                day_of_month: number | null;
                day_of_week: number | null;
                occurrence_count: number;
                period_total_cents: number;
                charged_date?: string;
            }>;
        }>;
    };
    savings: {
        monthly_total_cents: number;
        monthly_deposits_cents: number;
        monthly_withdrawals_cents: number;
        grand_total_cents: number;
        rows: Array<{ id: number; amount_cents: number; type: 'deposit' | 'withdrawal'; notes: string | null; month: string }>;
    };
    roll_over: {
        total_cents: number;
    };
    wallet: {
        available_cash_cents: number;
        savings_total_cents: number;
    };
};

export type BalanceSheetSnapshot = {
    id: number;
    month: string;
    total_income_cents: number;
    total_debt_paid_cents: number;
    total_spending_cents: number;
    total_recurring_cents: number;
    savings_snapshot_cents: number;
    roll_over_cents: number;
};

// ---------------------------------------------------------------------------
// Creator Suite domain types (Laravel API resource shapes)
// ---------------------------------------------------------------------------

export interface RegularIncomeScheduleVersion {
    id: number;
    regular_schedule_id: number;
    amount_cents: number;
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
    amount_cents: number;
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

export type LedgerFactDomain = 'income' | 'spending' | 'recurring' | 'debt' | 'savings';

export interface LedgerFact {
    domain: LedgerFactDomain;
    kind: string;
    occurred_on: string;
    amount_cents: number;
    direction: 'in' | 'out';
    classifier_id: number | null;
    classifier_name: string | null;
    instrument_id: number | null;
    source_id: number;
    label: string | null;
    detail: string | null;
}

export interface LedgerFeed {
    from: string;
    to: string;
    facts: LedgerFact[];
}

export interface Purchase {
    id: number;
    category_id: number;
    amount_cents: number;
    description: string;
    date: string;
    is_refunded: boolean;
    refunded_cents: number;
    remaining_refundable_cents: number;
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
    amount_cents: number;
    description: string;
    issue_date: string;
    settle_date: string | null;
    notes: string | null;
    remaining_cents: number;
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
    amount_cents: number;
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
    amount_cents: number;
    frequency: string;
    day_of_month: number | null;
    day_of_week: number | null;
    start_date: string;
    end_date: string | null;
    active: boolean;
}

export interface RecurringCharge {
    id: number;
    recurring_payment_entry_id: number;
    recurring_payment_stream_id: number;
    recurring_payment_category_id: number | null;
    stream_name: string;
    category_name: string | null;
    amount_cents: number;
    occurred_on: string;
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
    amount_cents: number;
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
    plan?: number;
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
    | 'budget'
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
