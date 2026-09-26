import BugReportDrawer from '@/components/bug-report/bug-report-drawer';
import DashboardHeader from '@/components/dashboard-header';
import SettingsDrawer from '@/components/settings/settings-drawer';
import { adminCopy, adminPaths } from '@/config/admin-copy';
import { BugReportProvider } from '@/contexts/bug-report';
import { FinanceDataProvider } from '@/contexts/finance-data';
import { SettingsProvider } from '@/contexts/settings';
import { dashboard } from '@/routes';
import { Head, Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

const NAV = [
    { href: adminPaths.overview, label: adminCopy.nav.overview, match: 'overview' as const },
    { href: adminPaths.bugReports, label: adminCopy.nav.bugReports, match: 'bug-reports' as const },
    { href: adminPaths.users, label: adminCopy.nav.users, match: 'users' as const },
    { href: adminPaths.admins, label: adminCopy.nav.admins, match: 'admins' as const },
];

export default function AdminLayout({
    title,
    heading,
    subtitle,
    current,
    toolbar,
    children,
}: {
    title: string;
    heading: string;
    subtitle: string;
    current: 'overview' | 'bug-reports' | 'users' | 'admins';
    toolbar?: ReactNode;
    children: ReactNode;
}) {
    return (
        <FinanceDataProvider>
            <SettingsProvider>
                <BugReportProvider>
                    <Head title={title} />
                    <DashboardHeader />
                    <SettingsDrawer />
                    <BugReportDrawer />

                    <div className="min-h-screen bg-slate-200 bg-[url('/branding/background_bubbles.svg')] bg-cover bg-center bg-no-repeat pt-20 dark:bg-neutral-950 dark:bg-[url('/branding/background_bubbles_dark.svg')]">
                        <div className="mx-auto max-w-6xl px-5 pb-10 pt-2 md:px-8">
                            <div className="rounded-2xl bg-white p-6 shadow-[0_4px_32px_rgba(0,0,0,0.08)] md:p-7 dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.45)]">
                                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h1 className="text-base font-semibold text-slate-900 dark:text-neutral-50">{heading}</h1>
                                        <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">{subtitle}</p>
                                    </div>
                                    {toolbar}
                                </div>

                                <nav className="mb-5 flex min-w-0 flex-wrap gap-1.5" aria-label="Admin">
                                    <Link
                                        href={dashboard()}
                                        className="rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-neutral-100"
                                    >
                                        {adminCopy.nav.dashboard}
                                    </Link>
                                    {NAV.map((item) => {
                                        const active = item.match === current;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                aria-current={active ? 'page' : undefined}
                                                className={`rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors ${
                                                    active
                                                        ? 'bg-slate-800 text-white dark:bg-white/10 dark:text-neutral-100'
                                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-neutral-100'
                                                }`}
                                            >
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </nav>

                                {children}
                            </div>
                        </div>
                    </div>
                </BugReportProvider>
            </SettingsProvider>
        </FinanceDataProvider>
    );
}
