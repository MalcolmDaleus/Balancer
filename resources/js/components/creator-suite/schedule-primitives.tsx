/**
 * Shared schedule / price / toggle primitives used by income + recurring panels.
 */
import { useFormatMoney } from '@/hooks/use-format-money';
import { useState } from 'react';
import { dateCls, Field, inputCls, selectCls } from './shared';

export const INCOME_FREQ_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    bimonthly: 'Every 2 months',
    quarterly: 'Quarterly',
    trimester: 'Trimester',
    biannually: 'Biannually',
    annual: 'Annually',
};

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtIncomeFreq(freq: string) {
    return INCOME_FREQ_LABELS[freq] ?? freq;
}

export function fmtRecurringFreq(freq: string) {
    if (freq === 'yearly') return 'Yearly';
    if (freq === 'weekly') return 'Weekly';
    return 'Monthly';
}

export function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function defaultDayOfMonth() {
    return String(new Date().getDate());
}

export function defaultDayOfWeek() {
    return String(new Date().getDay());
}

export function usesDayOfWeek(freq: string) {
    return freq === 'weekly' || freq === 'biweekly';
}

export function usesDayOfMonth(freq: string) {
    return !usesDayOfWeek(freq);
}

export function ToggleSwitch({
    on,
    size = 'md',
    disabled,
    onClick,
    label,
}: {
    on: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    onClick: (e: React.MouseEvent) => void;
    label?: string;
}) {
    const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
    const thumb = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const thumbOn = size === 'sm' ? 'translate-x-[18px]' : 'translate-x-6';
    const thumbOff = 'translate-x-0.5';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label ?? (on ? 'On' : 'Off')}
            disabled={disabled}
            onClick={onClick}
            className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${track} ${
                on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-neutral-600'
            }`}
        >
            <span
                className={`inline-block transform rounded-full bg-white shadow transition-transform ${thumb} ${on ? thumbOn : thumbOff}`}
            />
        </button>
    );
}

type HistoryRow = {
    id: number;
    amount: number;
    frequency: string;
    start_date: string;
    end_date: string | null;
    active: boolean;
};

/** Collapsible version / price history list */
export function ScheduleHistory({
    title,
    rows,
    formatFreq,
}: {
    title: string;
    rows: HistoryRow[];
    formatFreq: (freq: string) => string;
}) {
    const fmtAmount = useFormatMoney();
    const [open, setOpen] = useState(false);
    if (!rows.length) return null;

    return (
        <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
                <span>
                    {title} ({rows.length})
                </span>
                <span className="text-xs opacity-60">{open ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {open && (
                <div className="mt-2 space-y-1.5">
                    {rows.map((v) => {
                        const isCurrent = v.active && !v.end_date;
                        return (
                            <div
                                key={v.id}
                                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 text-sm ${
                                    isCurrent
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'bg-slate-50 opacity-70 dark:bg-neutral-800/40'
                                }`}
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-semibold text-slate-800 dark:text-neutral-100">{fmtAmount(v.amount)}</span>
                                    <span className="text-xs text-slate-500 dark:text-neutral-400">{formatFreq(v.frequency)}</span>
                                </div>
                                <span className="text-xs text-slate-500 dark:text-neutral-400">
                                    {fmtDate(v.start_date)}
                                    {v.end_date ? ` → ${fmtDate(v.end_date)}` : ' → now'}
                                </span>
                                {isCurrent && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        current
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export type IncomeVersionForm = {
    amount: string;
    start_date: string;
    frequency: string;
    day_of_month: string;
    day_of_week: string;
    anchor_date: string;
};

export function blankIncomeVersionForm(today: string): IncomeVersionForm {
    return {
        amount: '',
        start_date: today,
        frequency: 'monthly',
        day_of_month: defaultDayOfMonth(),
        day_of_week: defaultDayOfWeek(),
        anchor_date: today,
    };
}

export function IncomeVersionScheduleFields({
    versionForm,
    setVersionForm,
    amountLabel = 'Amount',
    startDateLabel = 'Effective from',
}: {
    versionForm: IncomeVersionForm;
    setVersionForm: React.Dispatch<React.SetStateAction<IncomeVersionForm>>;
    amountLabel?: string;
    startDateLabel?: string;
}) {
    const freq = versionForm.frequency;

    return (
        <>
            <Field label={amountLabel}>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputCls}
                    value={versionForm.amount}
                    onChange={(e) => setVersionForm((f) => ({ ...f, amount: e.target.value }))}
                />
            </Field>
            <Field label="Frequency">
                <select
                    className={selectCls}
                    value={versionForm.frequency}
                    onChange={(e) => setVersionForm((f) => ({ ...f, frequency: e.target.value }))}
                >
                    {Object.entries(INCOME_FREQ_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </Field>
            {usesDayOfWeek(freq) && (
                <Field label="Day of week">
                    <select
                        className={selectCls}
                        value={versionForm.day_of_week}
                        onChange={(e) => setVersionForm((f) => ({ ...f, day_of_week: e.target.value }))}
                    >
                        {DAY_NAMES.map((name, i) => (
                            <option key={i} value={i}>
                                {name}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {freq === 'biweekly' && (
                <Field label="Anchor date">
                    <input
                        type="date"
                        required
                        className={dateCls}
                        value={versionForm.anchor_date}
                        onChange={(e) => setVersionForm((f) => ({ ...f, anchor_date: e.target.value }))}
                    />
                </Field>
            )}
            {usesDayOfMonth(freq) && (
                <Field label="Day of month">
                    <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        className={inputCls}
                        value={versionForm.day_of_month}
                        onChange={(e) => setVersionForm((f) => ({ ...f, day_of_month: e.target.value }))}
                    />
                </Field>
            )}
            <Field label={startDateLabel}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={versionForm.start_date}
                    onChange={(e) => setVersionForm((f) => ({ ...f, start_date: e.target.value }))}
                />
            </Field>
        </>
    );
}

export type RecurringPriceForm = {
    amount: string;
    start_date: string;
    frequency: string;
    day_of_month: string;
    day_of_week: string;
};

export function RecurringPriceScheduleFields({
    priceForm,
    setPriceForm,
    amountLabel = 'Amount',
    startDateLabel = 'Starts on',
}: {
    priceForm: RecurringPriceForm;
    setPriceForm: React.Dispatch<React.SetStateAction<RecurringPriceForm>>;
    amountLabel?: string;
    startDateLabel?: string;
}) {
    const isWeekly = priceForm.frequency === 'weekly';

    return (
        <>
            <Field label={amountLabel}>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className={inputCls}
                    value={priceForm.amount}
                    onChange={(e) => setPriceForm((f) => ({ ...f, amount: e.target.value }))}
                />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Frequency">
                    <select
                        className={selectCls}
                        value={priceForm.frequency}
                        onChange={(e) =>
                            setPriceForm((f) => ({
                                ...f,
                                frequency: e.target.value,
                                day_of_week: e.target.value === 'weekly' ? f.day_of_week || String(new Date().getDay()) : '',
                                day_of_month: e.target.value === 'weekly' ? '' : f.day_of_month || defaultDayOfMonth(),
                            }))
                        }
                    >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </Field>
                {isWeekly ? (
                    <Field label="Day of week">
                        <select
                            className={selectCls}
                            required
                            value={priceForm.day_of_week}
                            onChange={(e) => setPriceForm((f) => ({ ...f, day_of_week: e.target.value }))}
                        >
                            {DAY_NAMES.map((label, value) => (
                                <option key={value} value={String(value)}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                ) : (
                    <Field label="Day of month">
                        <input
                            type="number"
                            min="1"
                            max="31"
                            required
                            className={inputCls}
                            value={priceForm.day_of_month}
                            onChange={(e) => setPriceForm((f) => ({ ...f, day_of_month: e.target.value }))}
                        />
                    </Field>
                )}
            </div>
            <Field label={startDateLabel}>
                <input
                    type="date"
                    required
                    className={dateCls}
                    value={priceForm.start_date}
                    onChange={(e) => setPriceForm((f) => ({ ...f, start_date: e.target.value }))}
                />
            </Field>
        </>
    );
}
