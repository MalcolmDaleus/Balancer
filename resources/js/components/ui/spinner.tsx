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
                    className="absolute inset-0 rounded-full border-[3px] border-violet-200 dark:border-violet-500/25"
                    aria-hidden
                />
                <Loader2
                    className="relative h-12 w-12 animate-spin text-violet-500 dark:text-violet-400"
                    strokeWidth={2.5}
                />
            </div>
        </div>
    );
}
