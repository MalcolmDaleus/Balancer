import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function Spinner({
    className,
    label = 'Loading',
}: {
    className?: string;
    label?: string;
}) {
    return (
        <div
            className={cn('flex h-full min-h-28 flex-col items-center justify-center gap-2', className)}
            role="status"
            aria-label={label}
        >
            <div className="relative h-12 w-12">
                <span
                    className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-neutral-700"
                    aria-hidden
                />
                <Loader2
                    className="relative h-12 w-12 animate-spin text-violet-400/80 dark:text-violet-300/70"
                    strokeWidth={2.25}
                />
            </div>
        </div>
    );
}
