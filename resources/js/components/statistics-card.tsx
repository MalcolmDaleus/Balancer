import { apiFetch, errorMessage } from '@/api/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Spinner } from '@/components/ui/spinner';
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
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';

const VIEWS: { id: StatisticsView | 'markers'; title: string; color: string }[] = [
    { id: 'trend', title: 'Trend', color: '#8b5cf6' },
    { id: 'compare', title: 'Compare', color: '#0ea5e9' },
    { id: 'share', title: 'Share', color: '#f59e0b' },
    { id: 'markers', title: 'Markers', color: '#10b981' },
];

const TREND_SERIES = [
    { id: 'leftover', label: 'Monthly leftover', color: '#8b5cf6' },
    { id: 'income_total', label: 'Total income', color: '#10b981' },
    { id: 'spend_net', label: 'Discretionary spend (net)', color: '#eab308' },
    { id: 'recurring_total', label: 'Recurring charged', color: '#fb923c' },
    { id: 'savings_net', label: 'Savings net', color: '#0ea5e9' },
    { id: 'savings_running', label: 'Running savings pot', color: '#38bdf8' },
    { id: 'recurring_load', label: 'Recurring as % of income', color: '#f97316' },
];

const COMPARE_SERIES = [
    { id: 'purchase_categories_month', label: 'Purchase categories (total)' },
    { id: 'purchase_categories_avg', label: 'Purchase categories (monthly avg)' },
    { id: 'outflow_domains_month', label: 'Outflow domains' },
    { id: 'leftover_by_month', label: 'Leftover by month' },
];

const SHARE_SERIES = [
    { id: 'outflow_mix', label: 'Outflow mix' },
    { id: 'purchase_categories', label: 'Purchase category share' },
    { id: 'income_mix', label: 'Income mix' },
];

const WINDOWS: { id: StatisticsWindow; label: string }[] = [
    { id: 1, label: 'This month' },
    { id: 3, label: 'Last 3 months' },
    { id: 6, label: 'Last 6 months' },
    { id: 12, label: 'Last 12 months' },
    { id: 24, label: 'Last 2 years' },
    { id: 60, label: 'Last 5 years' },
    { id: 'all', label: 'All time' },
];

/** Domain colors — match Creator Suite / Balance Sheet. */
const DOMAIN_COLORS: Record<string, string> = {
    Purchases: '#eab308',
    Recurring: '#fb923c',
    'Debt payments': '#ef4444',
    'Savings deposits': '#0ea5e9',
    Regular: '#10b981',
    Irregular: '#14b8a6',
    Refund: '#84cc16',
};

/** Mixed hues so category slices don't walk the rainbow in order. */
const MIXED_PALETTE = [
    '#0f766e',
    '#c2410c',
    '#4338ca',
    '#be123c',
    '#15803d',
    '#a21caf',
    '#1d4ed8',
    '#b45309',
    '#0e7490',
    '#86198f',
    '#ca8a04',
    '#475569',
];

const LEFTOVER_COLOR = '#8b5cf6';

function hashColor(name: string): string {
    let hash = 2166136261;
    for (let i = 0; i < name.length; i++) {
        hash ^= name.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return MIXED_PALETTE[Math.abs(hash) % MIXED_PALETTE.length];
}

function colorForSlice(name: string, seriesId: string): string {
    if (DOMAIN_COLORS[name]) {
        return DOMAIN_COLORS[name];
    }
    if (seriesId === 'leftover_by_month') {
        return LEFTOVER_COLOR;
    }
    return hashColor(name);
}

function pieLegendCols(count: number): 1 | 2 | 3 {
    if (count <= 6) {
        return 1;
    }
    if (count <= 12) {
        return 2;
    }
    return 3;
}

function parseWindowSelect(raw: string): StatisticsWindow {
    if (raw === 'all') {
        return 'all';
    }
    return Number(raw) as StatisticsWindow;
}

function pickDefaultWindow(
    available: StatisticsWindow[],
    view: StatisticsView | 'markers',
): StatisticsWindow {
    const order: StatisticsWindow[] = view === 'trend' ? [12, 6, 3, 24, 60] : [12, 6, 3, 1, 24, 60];
    for (const candidate of order) {
        if (available.includes(candidate)) {
            return candidate;
        }
    }
    return 'all';
}

function windowAllowed(
    window: StatisticsWindow,
    available: StatisticsWindow[] | null,
    view: StatisticsView | 'markers',
): boolean {
    if (view === 'trend' && window === 1) {
        return false;
    }
    if (available === null) {
        return true;
    }
    return available.includes(window);
}

const selectCls =
    'h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

function formatMonthTick(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) {
        return ym;
    }
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function markerTone(id: string): string {
    if (id === 'leftover_vs_avg') return 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200';
    if (id === 'top_category') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-200';
    if (id === 'savings_this_month') return 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200';
    if (id === 'recurring_load') return 'bg-orange-100 text-orange-800 dark:bg-orange-400/20 dark:text-orange-200';
    if (id === 'best_leftover_month') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200';
    if (id === 'worst_leftover_month') return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200';
    return 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-200';
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
    const [availableWindows, setAvailableWindows] = useState<StatisticsWindow[] | null>(null);
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

    const compareOptions = useMemo(
        () => COMPARE_SERIES.filter((s) => windowSize !== 1 || s.id !== 'purchase_categories_avg'),
        [windowSize],
    );

    useEffect(() => {
        if (windowSize === 1 && compareSeries === 'purchase_categories_avg') {
            setCompareSeries('purchase_categories_month');
        }
    }, [windowSize, compareSeries]);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeView === 'markers') {
                const payload = await apiFetch<StatisticsMarkers>(`/api/v1/statistics/markers?window=${windowSize}`);
                setMarkers(payload);
                setSeries(null);
                setAvailableWindows(payload.available_windows);
            } else {
                const seriesId =
                    activeView === 'trend' ? trendSeries : activeView === 'compare' ? compareSeries : shareSeries;
                const payload = await apiFetch<StatisticsSeries>(
                    `/api/v1/statistics?view=${activeView}&series=${seriesId}&window=${windowSize}`,
                );
                setSeries(payload);
                setMarkers(null);
                setAvailableWindows(payload.available_windows);
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

    useEffect(() => {
        if (windowAllowed(windowSize, availableWindows, activeView)) {
            return;
        }
        setWindowSize(pickDefaultWindow(availableWindows ?? ['all'], activeView));
    }, [activeView, availableWindows, windowSize]);

    const visibleWindows = useMemo(
        () =>
            WINDOWS.filter((w) => {
                if (activeView === 'trend' && w.id === 1) {
                    return false;
                }
                if (availableWindows === null) {
                    return w.id === 'all' || w.id === 1 || w.id === 3 || w.id === 6 || w.id === 12;
                }
                return availableWindows.includes(w.id);
            }),
        [activeView, availableWindows],
    );

    const seriesOptions = activeView === 'trend' ? TREND_SERIES : activeView === 'compare' ? compareOptions : SHARE_SERIES;
    const selectedSeries =
        activeView === 'trend' ? trendSeries : activeView === 'compare' ? compareSeries : shareSeries;
    const setSelectedSeries =
        activeView === 'trend' ? setTrendSeries : activeView === 'compare' ? setCompareSeries : setShareSeries;

    const selectionReady =
        availableWindows !== null && windowAllowed(windowSize, availableWindows, activeView);
    const seriesReady =
        selectionReady &&
        !isLoading &&
        series !== null &&
        activeView !== 'markers' &&
        series.view === activeView &&
        series.series === selectedSeries &&
        String(series.window) === String(windowSize);
    const markersReady =
        selectionReady &&
        !isLoading &&
        markers !== null &&
        activeView === 'markers' &&
        String(markers.window) === String(windowSize);

    const trendColor = TREND_SERIES.find((s) => s.id === trendSeries)?.color ?? '#8b5cf6';

    const chartData = useMemo(() => {
        if (!series) {
            return [];
        }
        return series.points.map((p: StatisticsPoint) => ({
            ...p,
            label: p.month ? formatMonthTick(p.month) : (p.name ?? ''),
            fill: colorForSlice(p.name ?? p.month ?? '', series.series),
        }));
    }, [series]);

    const yAxisWidth = useMemo(() => {
        if (!series || chartData.length === 0) {
            return 96;
        }
        const ticks = chartData.map((d) => formatValue(d.value, series.unit));
        const longest = Math.max(...ticks.map((t) => t.length), 8);
        return Math.min(128, Math.max(72, longest * 8 + 16));
    }, [chartData, formatValue, series]);

    const chartConfig = {
        value: { label: series?.label ?? 'Value', color: trendColor },
    };

    const periodLabel =
        seriesReady && series
            ? series.from === series.to
                ? formatMonthTick(series.from)
                : `${formatMonthTick(series.from)} – ${formatMonthTick(series.to)}`
            : markersReady && markers
              ? markers.from === markers.to
                  ? formatMonthTick(markers.from)
                  : `${formatMonthTick(markers.from)} – ${formatMonthTick(markers.to)}`
              : null;

    const pieTotal = chartData.reduce((sum, d) => sum + d.value, 0);
    const legendCols = pieLegendCols(chartData.length);

    return (
        <div
            className={`flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-7 shadow-[0_4px_32px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)] ${className}`}
        >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">Statistics</h2>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">
                        What’s typical, and what’s off
                        {periodLabel ? <span className="text-slate-500 dark:text-neutral-400"> · {periodLabel}</span> : null}
                    </p>
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

            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
                <select
                    className={selectCls}
                    value={String(windowSize)}
                    onChange={(e) => setWindowSize(parseWindowSelect(e.target.value))}
                    aria-label="Time window"
                >
                    {visibleWindows.map((w) => (
                        <option key={String(w.id)} value={String(w.id)}>
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
                {!error && !seriesReady && !markersReady && <Spinner label="Loading statistics" />}
                {!error && markersReady && markers && (
                    <MarkersGrid markers={markers.markers} formatValue={formatValue} />
                )}
                {!error && seriesReady && series && (
                    <div className={`w-full ${activeView === 'share' ? 'h-64 sm:h-72' : 'h-56 sm:h-64'}`}>
                        {chartData.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-neutral-500">No data in this window.</p>
                        ) : activeView === 'trend' && chartData.length < 2 ? (
                            <p className="text-sm text-slate-400 dark:text-neutral-500">
                                A trend needs at least two months of data.
                            </p>
                        ) : activeView === 'trend' ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="statsTrendFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={trendColor} stopOpacity={0.4} />
                                            <stop offset="100%" stopColor={trendColor} stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={yAxisWidth}
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
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={trendColor}
                                        strokeWidth={2.5}
                                        fill="url(#statsTrendFill)"
                                        dot={{ r: 3, fill: trendColor, stroke: '#fff', strokeWidth: 1 }}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : activeView === 'compare' ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={yAxisWidth}
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
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((d, i) => (
                                            <Cell key={d.label + i} fill={d.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div
                                className={`flex h-full min-h-0 items-center ${legendCols === 1 ? 'gap-3' : 'gap-4'}`}
                            >
                                <ChartContainer
                                    config={chartConfig}
                                    className={
                                        legendCols === 1
                                            ? 'h-full min-w-0 flex-1'
                                            : 'h-full w-[32%] max-w-[14rem] shrink-0'
                                    }
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(v) => formatValue(Number(v ?? 0), series.unit)}
                                                    labelFormatter={(_, items) => String(items?.[0]?.payload?.label ?? '')}
                                                />
                                            }
                                        />
                                        <Pie
                                            data={chartData}
                                            dataKey="value"
                                            nameKey="label"
                                            innerRadius={0}
                                            outerRadius="80%"
                                            paddingAngle={1}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        >
                                            {chartData.map((d, i) => (
                                                <Cell key={d.label + i} fill={d.fill} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <ul
                                    className={
                                        legendCols === 1
                                            ? 'flex max-h-full w-[42%] shrink-0 flex-col justify-center gap-1.5 overflow-y-auto pr-1 text-xs'
                                            : `grid max-h-full min-w-0 flex-1 content-center gap-x-4 gap-y-2 overflow-y-auto pr-1 text-xs ${
                                                  legendCols === 2 ? 'grid-cols-2' : 'grid-cols-3'
                                              }`
                                    }
                                >
                                    {chartData.map((d) => {
                                        const pct = pieTotal > 0 ? (d.value / pieTotal) * 100 : 0;
                                        return (
                                            <li key={d.label} className="flex min-w-0 items-start gap-2">
                                                <span
                                                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: d.fill }}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-medium text-slate-800 dark:text-neutral-100">
                                                        {d.label}
                                                    </span>
                                                    <span className="tabular-nums text-slate-500 dark:text-neutral-400">
                                                        {formatValue(d.value, series.unit)} · {pct.toFixed(0)}%
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-center gap-2">
                {VIEWS.map((v, i) => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => setViewIndex(i)}
                        aria-label={v.title}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                            i === viewIndex ? 'w-7' : 'w-2.5 opacity-40 hover:opacity-70'
                        }`}
                        style={{ backgroundColor: v.color }}
                    />
                ))}
            </div>
            <p className="mt-1 text-center text-[11px] font-medium" style={{ color: VIEWS[viewIndex].color }}>
                {VIEWS[viewIndex].title}
            </p>
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
                <div key={m.id} className={`rounded-xl px-4 py-3.5 ${markerTone(m.id)}`}>
                    <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{m.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatValue(m.value, m.unit)}</p>
                    {m.month && <p className="text-xs opacity-70">{formatMonthTick(m.month)}</p>}
                    {m.delta !== undefined && m.baseline !== undefined && Math.abs(m.delta) >= 0.005 && (
                        <p className={`text-xs tabular-nums ${markerDeltaClass(m.delta)}`}>
                            {m.delta > 0 ? '+' : ''}
                            {formatValue(m.delta, m.unit)} vs avg {formatValue(m.baseline, m.unit)}
                        </p>
                    )}
                    {m.baseline !== undefined && (m.delta === undefined || Math.abs(m.delta) < 0.005) && (
                        <p className="text-xs opacity-70">avg {formatValue(m.baseline, m.unit)}/mo</p>
                    )}
                </div>
            ))}
        </div>
    );
}
