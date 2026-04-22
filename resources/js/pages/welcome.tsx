import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const isAuthenticated = !!(auth as { user?: unknown } | undefined)?.user;

    return (
        <>
            <Head title="Home" />

            <main
                className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] flex min-h-screen items-center justify-center bg-slate-200 bg-cover bg-center bg-no-repeat px-6 dark:bg-slate-900"
            >
                <AppearanceToggleDropdown className="fixed top-4 left-4 z-20" />

                <div className="flex w-full max-w-xl flex-col items-center gap-8">
                    {/* Per product rule: DARK theme uses LIGHT logo, and light theme uses DARK logo. */}
                    <img src="/branding/logo_dark.svg" alt="Balancer logo" className="h-auto w-full max-w-[520px] dark:hidden" />
                    <img src="/branding/logo_light.svg" alt="Balancer logo" className="hidden h-auto w-full max-w-[520px] dark:block" />

                    {isAuthenticated ? (
                        <Link
                            href={dashboard()}
                            className="rounded-lg bg-slate-800 px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                            Go to Dashboard
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                href={login()}
                                className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            >
                                Log in
                            </Link>
                            <Link
                                href={register()}
                                className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
