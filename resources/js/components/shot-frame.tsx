/**
 * Holds a marketing screenshot in a fixed frame.
 * Light and dark files swap with the `dark` class on the document.
 * Until art is ready, both sources are omitted and the frame shows its export size.
 */
export default function ShotFrame({
    src,
    srcDark,
    alt,
    label,
    size,
    accent = 'bg-slate-400',
    className = '',
}: {
    src?: string;
    srcDark?: string;
    alt: string;
    label: string;
    size: string;
    accent?: string;
    className?: string;
}) {
    return (
        <div className={`relative overflow-hidden bg-slate-100 dark:bg-neutral-800 ${className}`}>
            {src ? (
                <>
                    <img src={src} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${srcDark ? 'dark:hidden' : ''}`} />
                    {srcDark ? (
                        <img src={srcDark} alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover dark:block" />
                    ) : null}
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-neutral-300">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent}`} />
                        {label}
                    </div>
                    <div className="space-y-2" aria-hidden>
                        <div className="h-2 w-2/5 rounded-full bg-slate-300/90 dark:bg-neutral-600" />
                        <div className="h-2 w-3/5 rounded-full bg-slate-200 dark:bg-neutral-700" />
                        <div className="h-16 w-full rounded-xl bg-white/70 dark:bg-neutral-900/40" />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500">{size}</p>
                </div>
            )}
        </div>
    );
}
