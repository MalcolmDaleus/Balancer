import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        icon?: React.ComponentType;
    } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> })
>;

type ChartContextProps = {
    config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error('useChart must be used within a <ChartContainer />');
    }
    return context;
}

function ChartContainer({
    id,
    className,
    children,
    config,
    ...props
}: React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-slot="chart"
                data-chart={chartId}
                className={cn(
                    "flex aspect-auto justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                    {children}
                </RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(([, item]) => item.theme ?? item.color);

    if (!colorConfig.length) {
        return null;
    }

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
        return color ? `  --color-${key}: ${color};` : null;
    })
    .join('\n')}
}
`,
                    )
                    .join('\n'),
            }}
        />
    );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipItem = {
    name?: string;
    dataKey?: string | number;
    value?: number | string;
    payload?: Record<string, unknown>;
};

function ChartTooltipContent({
    active,
    payload,
    className,
    hideLabel = false,
    label,
    labelFormatter,
    formatter,
    nameKey,
}: {
    active?: boolean;
    payload?: TooltipItem[];
    className?: string;
    hideLabel?: boolean;
    label?: React.ReactNode;
    labelFormatter?: (label: unknown, payload: TooltipItem[]) => React.ReactNode;
    formatter?: (value: number, name: string) => React.ReactNode;
    nameKey?: string;
}) {
    const { config } = useChart();

    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className={cn('grid min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl', className)}>
            {!hideLabel && (
                <div className="font-medium">
                    {labelFormatter ? labelFormatter(label, payload) : (label ?? null)}
                </div>
            )}
            <div className="grid gap-1">
                {payload.map((item) => {
                    const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
                    const itemConfig = config[key];
                    const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);

                    return (
                        <div key={key} className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                            <span className="font-mono font-medium tabular-nums text-foreground">
                                {formatter ? formatter(value, String(item.name ?? key)) : value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
