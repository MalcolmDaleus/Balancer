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

/** Format YYYY-MM as "Month Year" using the given locale (or browser default). */
export function formatMonthLabel(ym: string, locale?: string | null): string {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const resolved = locale || undefined;
    return date.toLocaleDateString(resolved, { month: 'long', year: 'numeric' });
}
