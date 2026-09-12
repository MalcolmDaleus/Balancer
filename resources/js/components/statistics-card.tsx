import { apiFetch, errorMessage } from '@/api/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { dashboardCopy } from '@/config/dashboard-copy';
import { Spinner } from '@/components/ui/spinner';
import { useFinanceDataOptional } from '@/contexts/finance-data';
import { useFormatMoney } from '@/hooks/use-format-money';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    type StatisticsMarker,
    type StatisticsMarkers,
    type StatisticsPoint,
    type StatisticsSeries,
    type StatisticsView,
    type StatisticsWindow,
} from '@/types/api';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
    { id: 'trend', title: dashboardCopy.statistics.views.trend, color: '#8b5cf6' },
    { id: 'compare', title: dashboardCopy.statistics.views.compare, color: '#0ea5e9' },
    { id: 'share', title: dashboardCopy.statistics.views.share, color: '#f59e0b' },
    { id: 'markers', title: dashboardCopy.statistics.views.markers, color: '#10b981' },
];

const TREND_SERIES = [
    { id: 'leftover', label: dashboardCopy.statistics.trendSeries.leftover, color: '#8b5cf6' },
    { id: 'income_total', label: dashboardCopy.statistics.trendSeries.income_total, color: '#10b981' },
    { id: 'spend_net', label: dashboardCopy.statistics.trendSeries.spend_net, color: '#eab308' },
    { id: 'recurring_total', label: dashboardCopy.statistics.trendSeries.recurring_total, color: '#fb923c' },
    { id: 'savings_net', label: dashboardCopy.statistics.trendSeries.savings_net, color: '#0ea5e9' },
    { id: 'savings_running', label: dashboardCopy.statistics.trendSeries.savings_running, color: '#38bdf8' },
    { id: 'recurring_load', label: dashboardCopy.statistics.trendSeries.recurring_load, color: '#f97316' },
    { id: 'budget_adherence', label: dashboardCopy.statistics.trendSeries.budget_adherence, color: '#14b8a6' },
    { id: 'budget_left', label: dashboardCopy.statistics.trendSeries.budget_left, color: '#0d9488' },
];

const COMPARE_SERIES = [
    { id: 'purchase_categories_month', label: dashboardCopy.statistics.compareSeries.purchase_categories_month },
    { id: 'purchase_categories_avg', label: dashboardCopy.statistics.compareSeries.purchase_categories_avg },
    { id: 'outflow_domains_month', label: dashboardCopy.statistics.compareSeries.outflow_domains_month },
    { id: 'leftover_by_month', label: dashboardCopy.statistics.compareSeries.leftover_by_month },
    { id: 'budget_by_category', label: dashboardCopy.statistics.compareSeries.budget_by_category },
];

const SHARE_SERIES = [
    { id: 'outflow_mix', label: dashboardCopy.statistics.shareSeries.outflow_mix },
    { id: 'purchase_categories', label: dashboardCopy.statistics.shareSeries.purchase_categories },
    { id: 'income_mix', label: dashboardCopy.statistics.shareSeries.income_mix },
];

const WINDOWS: { id: StatisticsWindow; label: string }[] = [
    { id: 1, label: dashboardCopy.statistics.windows[1] },
    { id: 3, label: dashboardCopy.statistics.windows[3] },
    { id: 6, label: dashboardCopy.statistics.windows[6] },
    { id: 12, label: dashboardCopy.statistics.windows[12] },
    { id: 24, label: dashboardCopy.statistics.windows[24] },
    { id: 60, label: dashboardCopy.statistics.windows[60] },
    { id: 'all', label: dashboardCopy.statistics.windows.all },
];

/** Domain colors — match Creator Suite / Balance Sheet. */
const DOMAIN_COLORS: Record<string, string> = {
    Purchases: '#eab308',
    Recurring: '#fb923c',
    'Debt payments': '#ef4444',
    'Savings deposits': '#0ea5e9',
    Regular: '#10b981',
    Irregular: '#6366f1',
    Refund: '#f59e0b',
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

/**
 * Integer stride from the first month. Every gap is the same number of months.
 * The current month is unlabeled unless it lands on the stride (hover still shows it).
 */
function pickEvenTicks(labels: string[], maxTicks: number): string[] {
    const n = labels.length;
    if (n <= 2) {
        return labels;
    }
    const max = Math.min(Math.max(2, maxTicks), n);
    let step = 1;
    while (Math.floor((n - 1) / step) + 1 > max) {
        step += 1;
    }
    const ticks: string[] = [];
    for (let i = 0; i < n; i += step) {
        ticks.push(labels[i]);
    }
    return ticks;
}

const TREND_TICK_SLOT_PX = 58;

function compactFormattedMoney(value: number, formatMoney: (value: number) => string): string {
    const formatted = formatMoney(value);
    const major = Math.abs(value) / 100;
    if (major < 1000) {
        return formatted.replace(/[.,]00\b/, '');
    }

    const compact = `${(major / 1000).toFixed(major >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
    const prefix = formatted.match(/^[^\d-]+/)?.[0] ?? '';
    const suffix = formatted.match(/[^\d.,\s]+$/)?.[0] ?? '';
    const sign = value < 0 ? '-' : '';
    return `${prefix}${sign}${compact}${suffix === prefix ? '' : suffix}`;
}

const MARKER_CARD_CLS = 'rounded-xl bg-slate-100 px-4 py-3.5 dark:bg-neutral-800/80';

function markerDeltaClass(delta: number | undefined): string {
    if (delta === undefined || delta === 0) {
        return 'text-slate-500 dark:text-neutral-400';
    }
    return delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
}

export default function StatisticsCard({ className = '' }: { className?: string }) {
    const amount = useFormatMoney();
    const isMobile = useIsMobile();
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
    const chartBoxRef = useRef<HTMLDivElement>(null);
    const [plotWidth, setPlotWidth] = useState(0);

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

    const formatAxisValue = useCallback(
        (value: number, unit: 'money' | 'percent' = 'money') => {
            if (unit === 'percent') {
                return `${(value * 100).toFixed(0)}%`;
            }
            return isMobile ? compactFormattedMoney(value, amount) : amount(value);
        },
        [amount, isMobile],
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
            return isMobile ? 44 : 96;
        }
        const ticks = chartData.map((d) => formatAxisValue(d.value, series.unit));
        const longest = Math.max(...ticks.map((t) => t.length), 4);
        return isMobile ? Math.min(52, Math.max(42, longest * 7 + 10)) : Math.min(128, Math.max(72, longest * 8 + 16));
    }, [chartData, formatAxisValue, isMobile, series]);

    useLayoutEffect(() => {
        const el = chartBoxRef.current;
        if (!el) {
            return;
        }
        const update = () => setPlotWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [seriesReady, markersReady, activeView]);

    const trendAxisTicks = useMemo(() => {
        const labels = chartData.map((d) => d.label);
        const xBudget = Math.max(0, plotWidth - yAxisWidth - 24);
        const maxTicks = Math.max(2, Math.floor(xBudget / TREND_TICK_SLOT_PX));
        return pickEvenTicks(labels, maxTicks);
    }, [chartData, plotWidth, yAxisWidth]);

    const categoryAxisWidth = useMemo(() => {
        if (!isMobile || chartData.length === 0) {
            return 96;
        }
        const longest = Math.max(...chartData.map((d) => d.label.length), 8);
        return Math.min(108, Math.max(72, longest * 6.5));
    }, [chartData, isMobile]);

    const chartConfig = {
        value: { label: series?.label ?? dashboardCopy.statistics.value, color: trendColor },
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
                    <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-50">{dashboardCopy.statistics.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">
                        {dashboardCopy.statistics.subtitle}
                        {periodLabel ? <span className="text-slate-500 dark:text-neutral-400"> · {periodLabel}</span> : null}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label={dashboardCopy.statistics.refresh}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="stats-toolbar mb-7 flex shrink-0 flex-wrap items-center gap-2">
                <select
                    className={selectCls}
                    value={String(windowSize)}
                    onChange={(e) => setWindowSize(parseWindowSelect(e.target.value))}
                    aria-label={dashboardCopy.statistics.timeWindow}
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
                        aria-label={dashboardCopy.statistics.series}
                    >
                        {seriesOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
                {!error && !seriesReady && !markersReady && <Spinner label={dashboardCopy.statistics.loading} />}
                {!error && markersReady && markers && (
                    <MarkersGrid markers={markers.markers} formatValue={formatValue} />
                )}
                {!error && seriesReady && series && (
                    <div ref={chartBoxRef} className="flex min-h-0 w-full flex-1 flex-col">
                        {chartData.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-neutral-500">{dashboardCopy.statistics.noData}</p>
                        ) : activeView === 'trend' && chartData.length < 2 ? (
                            <p className="text-sm text-slate-400 dark:text-neutral-500">
                                {dashboardCopy.statistics.trendNeedsTwo}
                            </p>
                        ) : activeView === 'trend' ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 8, right: 28, left: 4, bottom: 4 }}
                                >
                                    <defs>
                                        <linearGradient id="statsTrendFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={trendColor} stopOpacity={0.4} />
                                            <stop offset="100%" stopColor={trendColor} stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                                    <XAxis
                                        dataKey="label"
                                        ticks={trendAxisTicks}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        interval={0}
                                        padding={{ left: 4, right: 8 }}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={yAxisWidth}
                                        tickMargin={4}
                                        tickFormatter={(v) => formatAxisValue(Number(v), series.unit)}
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
                                        dot={isMobile ? false : { r: 3, fill: trendColor, stroke: '#fff', strokeWidth: 1 }}
                                        activeDot={{ r: 4, fill: trendColor, stroke: '#fff', strokeWidth: 1 }}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : activeView === 'compare' ? (
                            <ChartContainer
                                config={chartConfig}
                                className="h-full w-full min-h-0 [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible"
                            >
                                <BarChart
                                    data={chartData}
                                    layout={isMobile ? 'vertical' : 'horizontal'}
                                    margin={{
                                        top: 16,
                                        right: isMobile ? 12 : 8,
                                        left: isMobile ? 4 : 4,
                                        bottom: isMobile ? 0 : 12,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={!isMobile}
                                        horizontal={isMobile}
                                        stroke="#cbd5e1"
                                    />
                                    {isMobile ? (
                                        <>
                                            <XAxis
                                                type="number"
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => formatAxisValue(Number(v), series.unit)}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="label"
                                                tickLine={false}
                                                axisLine={false}
                                                width={categoryAxisWidth}
                                                interval={0}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <XAxis
                                                dataKey="label"
                                                tickLine={false}
                                                axisLine={false}
                                                interval={0}
                                                angle={-22}
                                                textAnchor="end"
                                                height={76}
                                                tickMargin={10}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                width={yAxisWidth}
                                                tickFormatter={(v) => formatAxisValue(Number(v), series.unit)}
                                            />
                                        </>
                                    )}
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(v) => formatValue(Number(v ?? 0), series.unit)}
                                                labelFormatter={(_, items) => String(items?.[0]?.payload?.label ?? '')}
                                            />
                                        }
                                    />
                                    <Bar dataKey="value" name={dashboardCopy.statistics.spent} radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}>
                                        {chartData.map((d, i) => (
                                            <Cell key={d.label + i} fill={d.fill} />
                                        ))}
                                    </Bar>
                                    {series.series === 'budget_by_category' && (
                                        <Bar
                                            dataKey="plan"
                                            name={dashboardCopy.statistics.plan}
                                            fill="#94a3b8"
                                            radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                                        />
                                    )}
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div
                                className={`flex h-full min-h-0 flex-col md:flex-row md:items-center ${
                                    legendCols === 1 ? 'gap-3' : legendCols === 2 ? 'gap-5' : 'gap-4'
                                }`}
                            >
                                <ChartContainer
                                    config={chartConfig}
                                    className={
                                        legendCols === 1
                                            ? 'h-[52%] min-h-[10rem] w-full shrink-0 md:h-full md:min-h-0 md:min-w-0 md:flex-1'
                                            : legendCols === 2
                                              ? 'h-[52%] min-h-[10rem] w-full shrink-0 md:h-full md:min-h-0 md:w-[46%] md:flex-none'
                                              : 'h-[52%] min-h-[10rem] w-full shrink-0 md:h-full md:min-h-0 md:w-[30%] md:flex-none'
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
                                            outerRadius="82%"
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
                                            ? 'flex min-h-0 w-full flex-1 flex-col justify-start gap-3 overflow-y-auto pr-1 text-left text-xs md:max-h-full md:w-[42%] md:flex-none md:justify-center'
                                            : legendCols === 2
                                              ? 'grid min-h-0 w-full flex-1 grid-cols-1 content-start justify-items-start gap-x-6 gap-y-3 overflow-y-auto pr-1 text-left text-xs md:w-fit md:max-h-full md:max-w-full md:flex-none md:grid-cols-2 md:content-center'
                                              : 'grid min-h-0 w-full flex-1 grid-cols-1 content-start justify-items-start gap-x-5 gap-y-3 overflow-y-auto pr-1 text-left text-xs md:w-fit md:max-h-full md:max-w-full md:flex-none md:grid-cols-3 md:content-center'
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

            <div className="mt-5 flex shrink-0 items-center justify-center gap-2">
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
                <div key={m.id} className={MARKER_CARD_CLS}>
                    <p className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-neutral-400">
                        {m.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                        {formatValue(m.value, m.unit)}
                    </p>
                    {m.month && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400">{formatMonthTick(m.month)}</p>
                    )}
                    {m.delta !== undefined && m.baseline !== undefined && Math.abs(m.delta) >= 0.005 && (
                        <p className={`text-xs tabular-nums ${markerDeltaClass(m.delta)}`}>
                            {dashboardCopy.statistics.vsAvg(
                                `${m.delta > 0 ? '+' : ''}${formatValue(m.delta, m.unit)}`,
                                formatValue(m.baseline, m.unit),
                            )}
                        </p>
                    )}
                    {m.baseline !== undefined && (m.delta === undefined || Math.abs(m.delta) < 0.005) && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            {dashboardCopy.statistics.avgPerMonth(formatValue(m.baseline, m.unit))}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
