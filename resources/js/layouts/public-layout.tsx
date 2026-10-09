import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import PublicFooter from '@/components/public-footer';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

/** Landing-style shell (logo header + legal footer) for public pages outside the app. */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh flex-col bg-slate-200 text-slate-900 dark:bg-neutral-950 dark:text-neutral-50">
            <header className="sticky top-0 z-30 border-b border-slate-900/8 bg-slate-200/80 backdrop-blur-xl dark:border-white/8 dark:bg-neutral-950/80">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
                    <Link href="/" className="min-w-0 shrink">
                        <img src="/branding/logo_dark.svg" alt="Balancer" className="h-7 w-auto dark:hidden" />
                        <img src="/branding/logo_light.svg" alt="Balancer" className="hidden h-7 w-auto dark:block" />
                    </Link>
                    <AppearanceToggleDropdown />
                </div>
            </header>

            <main className="relative flex-1">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[url('/branding/background_bubbles.svg')] bg-cover bg-center opacity-50 dark:bg-[url('/branding/background_bubbles_dark.svg')] dark:opacity-40"
                />
                <div className="relative">{children}</div>
            </main>

            <PublicFooter />
        </div>
    );
}
