import { apiFetch, errorMessage } from '@/api/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useFinanceDataOptional } from '@/contexts/finance-data';
import { useFormatMoney } from '@/hooks/use-format-money';
import {
    type StatisticsMarker,
    type StatisticsMarkers,
    type StatisticsPoint,
    type StatisticsSeries,
    type StatisticsView,
    type StatisticsWindow,
} from '@/types/api';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

const VIEWS: { id: StatisticsView | 'markers'; title: string }[] = [
    { id: 'trend', title: 'Trend' },
    { id: 'compare', title: 'Compare' },
    { id: 'share', title: 'Share' },
    { id: 'markers', title: 'Markers' },
];

const TREND_SERIES = [
    { id: 'leftover', label: 'Monthly leftover' },
    { id: 'income_total', label: 'Total income' },
    { id: 'spend_net', label: 'Discretionary spend (net)' },
    { id: 'recurring_total', label: 'Recurring charged' },
    { id: 'savings_net', label: 'Savings net' },
    { id: 'savings_running', label: 'Running savings pot' },
    { id: 'recurring_load', label: 'Recurring as % of income' },
];

const COMPARE_SERIES = [
    { id: 'purchase_categories_month', label: 'Purchase categories (this month)' },
    { id: 'purchase_categories_avg', label: 'Purchase categories (window average)' },
    { id: 'outflow_domains_month', label: 'Outflow domains (this month)' },
    { id: 'leftover_by_month', label: 'Leftover by month' },
];

const SHARE_SERIES = [
    { id: 'outflow_mix', label: 'Outflow mix' },
    { id: 'purchase_categories', label: 'Purchase category share' },
    { id: 'income_mix', label: 'Income mix' },
];

const WINDOWS: { id: StatisticsWindow; label: string }[] = [
    { id: 1, label: 'This month' },
    { id: 6, label: 'Last 6' },
    { id: 12, label: 'Last 12' },
];

const PIE_COLORS = ['#64748b', '#94a3b8', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

const selectCls =
    'h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

function formatMonthTick(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) {
        return ym;
    }
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function markerDeltaClass(delta: number | undefined): string {
    if (delta === undefined || delta === 0) {
        return 'text-slate-500 dark:text-neutral-400';
    }
    return delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
}

export default function StatisticsCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const finance = useFinanceDataOptional();

    const [viewIndex, setViewIndex] = useState(0);
    const [windowSize, setWindowSize] = useState<StatisticsWindow>(12);
    const [trendSeries, setTrendSeries] = useState('leftover');
    const [compareSeries, setCompareSeries] = useState('purchase_categories_month');
    const [shareSeries, setShareSeries] = useState('outflow_mix');

    const [series, setSeries] = useState<StatisticsSeries | null>(null);
    const [markers, setMarkers] = useState<StatisticsMarkers | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const activeView = VIEWS[viewIndex].id;

    const formatValue = useCallback(
        (value: number, unit: 'money' | 'percent' = 'money') => {
            if (unit === 'percent') {
                return `${(value * 100).toFixed(1)}%`;
            }
            return amount(value);
        },
        [amount],
    );

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeView === 'markers') {
                const payload = await apiFetch<StatisticsMarkers>(`/api/v1/statistics/markers?window=${windowSize}`);
                setMarkers(payload);
                setSeries(null);
            } else {
                const seriesId =
                    activeView === 'trend' ? trendSeries : activeView === 'compare' ? compareSeries : shareSeries;
                const payload = await apiFetch<StatisticsSeries>(
                    `/api/v1/statistics?view=${activeView}&series=${seriesId}&window=${windowSize}`,
                );
                setSeries(payload);
                setMarkers(null);
            }
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [activeView, windowSize, trendSeries, compareSeries, shareSeries]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (finance && finance.financeEpoch > 0) {
            void load();
        }
    }, [finance?.financeEpoch, load]);

    const seriesOptions = activeView === 'trend' ? TREND_SERIES : activeView === 'compare' ? COMPARE_SERIES : SHARE_SERIES;
    const selectedSeries =
        activeView === 'trend' ? trendSeries : activeView === 'compare' ? compareSeries : shareSeries;
    const setSelectedSeries =
        activeView === 'trend' ? setTrendSeries : activeView === 'compare' ? setCompareSeries : setShareSeries;

    const chartData = useMemo(() => {
        if (!series) {
            return [];
        }
        return series.points.map((p: StatisticsPoint) => ({
            ...p,
            label: p.name ?? (p.month ? formatMonthTick(p.month) : ''),
        }));
    }, [series]);

    const chartConfig = {
        value: { label: series?.label ?? 'Value', color: 'var(--color-slate-600)' },
    };

    return (
        <div
            className={`flex min-h-0 flex-col rounded-2xl bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">Statistics</h2>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">What’s typical, and what’s off</p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label="Refresh statistics"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
                <select
                    className={selectCls}
                    value={windowSize}
                    onChange={(e) => setWindowSize(Number(e.target.value) as StatisticsWindow)}
                    aria-label="Time window"
                >
                    {WINDOWS.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.label}
                        </option>
                    ))}
                </select>

                {activeView !== 'markers' && (
                    <select
                        className={`${selectCls} min-w-0 flex-1`}
                        value={selectedSeries}
                        onChange={(e) => setSelectedSeries(e.target.value)}
                        aria-label="Series"
                    >
                        {seriesOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="min-h-0 flex-1">
                {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
                {!error && isLoading && !series && !markers && (
                    <p className="text-sm text-slate-400 dark:text-neutral-500">Loading…</p>
                )}
                {!error && activeView === 'markers' && markers && (
                    <MarkersGrid markers={markers.markers} formatValue={formatValue} />
                )}
                {!error && activeView !== 'markers' && series && (
                    <div className="h-56 w-full sm:h-64">
                        {chartData.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-neutral-500">No data in this window.</p>
                        ) : activeView === 'trend' ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={56}
                                        tickFormatter={(v) => formatValue(Number(v), series.unit)}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(v) => formatValue(Number(v ?? 0), series.unit)}
                                                labelFormatter={(_, items) => String(items?.[0]?.payload?.label ?? '')}
                                            />
                                        }
                                    />
                                    <Line type="monotone" dataKey="value" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ChartContainer>
                        ) : activeView === 'compare' ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={56}
                                        tickFormatter={(v) => formatValue(Number(v), series.unit)}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(v) => formatValue(Number(v ?? 0), series.unit)}
                                                labelFormatter={(_, items) => String(items?.[0]?.payload?.label ?? '')}
                                            />
                                        }
                                    />
                                    <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <PieChart>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(v) => formatValue(Number(v ?? 0), series.unit)}
                                                labelFormatter={(_, items) => String(items?.[0]?.payload?.label ?? '')}
                                            />
                                        }
                                    />
                                    <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={48} outerRadius={80} paddingAngle={2}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
                {VIEWS.map((v, i) => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => setViewIndex(i)}
                        aria-label={v.title}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            i === viewIndex
                                ? 'w-6 bg-slate-700 dark:bg-neutral-200'
                                : 'w-2 bg-slate-400/50 dark:bg-neutral-700'
                        }`}
                    />
                ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-neutral-500">{VIEWS[viewIndex].title}</p>
        </div>
    );
}

function MarkersGrid({
    markers,
    formatValue,
}: {
    markers: StatisticsMarker[];
    formatValue: (value: number, unit: 'money' | 'percent') => string;
}) {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {markers.map((m) => (
                <div key={m.id} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-neutral-800/70">
                    <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-neutral-400">{m.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-neutral-50">
                        {formatValue(m.value, m.unit)}
                    </p>
                    {m.month && (
                        <p className="text-xs text-slate-400 dark:text-neutral-500">{formatMonthTick(m.month)}</p>
                    )}
                    {m.delta !== undefined && m.baseline !== undefined && (
                        <p className={`text-xs tabular-nums ${markerDeltaClass(m.delta)}`}>
                            {m.delta > 0 ? '+' : ''}
                            {formatValue(m.delta, m.unit)} vs avg {formatValue(m.baseline, m.unit)}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
