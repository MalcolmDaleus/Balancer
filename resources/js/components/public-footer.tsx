import { legalCopy } from '@/config/legal-copy';
import { Link } from '@inertiajs/react';

export default function PublicFooter({ tagline }: { tagline?: string }) {
    return (
        <footer className="border-t border-slate-900/8 px-5 py-8 sm:px-8 dark:border-white/8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
                <Link href="/" aria-label={legalCopy.links.home}>
                    <img src="/branding/logo_dark.svg" alt="" className="h-5 w-auto opacity-50 dark:hidden" />
                    <img src="/branding/logo_light.svg" alt="" className="hidden h-5 w-auto opacity-50 dark:block" />
                </Link>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 dark:text-neutral-500">
                    {tagline ? <p>{tagline}</p> : null}
                    <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-neutral-200">
                        {legalCopy.links.privacy}
                    </Link>
                    <Link href="/terms" className="hover:text-slate-700 dark:hover:text-neutral-200">
                        {legalCopy.links.terms}
                    </Link>
                </div>
            </div>
        </footer>
    );
}
