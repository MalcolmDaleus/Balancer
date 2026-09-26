import {
    AdminEmptyRow,
    AdminTable,
    AdminTableBody,
    AdminTableHead,
    AdminTd,
    AdminTh,
    bugReportStatusColor,
} from '@/components/admin/admin-table';
import { StatusChip } from '@/components/creator-suite/shared';
import { adminCopy, adminPaths, formatAdminDate } from '@/config/admin-copy';
import AdminLayout from '@/layouts/admin-layout';
import { type AdminBugReport } from '@/types/admin';
import { Link } from '@inertiajs/react';

type OverviewProps = {
    stats: {
        users: number;
        admins: number;
        bug_reports: number;
        new_bug_reports: number;
    };
    recent_reports: AdminBugReport[];
};

const STATS = [
    { key: 'users' as const, label: adminCopy.overview.users, href: adminPaths.users },
    { key: 'admins' as const, label: adminCopy.overview.admins, href: adminPaths.admins },
    { key: 'bug_reports' as const, label: adminCopy.overview.bugReports, href: adminPaths.bugReports },
    { key: 'new_bug_reports' as const, label: adminCopy.overview.newReports, href: `${adminPaths.bugReports}?status=new` },
];

export default function AdminOverview({ stats, recent_reports }: OverviewProps) {
    return (
        <AdminLayout
            title={adminCopy.overview.headTitle}
            heading={adminCopy.overview.title}
            subtitle={adminCopy.overview.subtitle}
            current="overview"
        >
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {STATS.map((stat) => (
                    <Link
                        key={stat.key}
                        href={stat.href}
                        className="rounded-xl bg-slate-50/70 px-4 py-4 transition-colors hover:bg-slate-100/80 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/60"
                    >
                        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-400">
                            {stat.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-neutral-50">
                            {stats[stat.key]}
                        </p>
                    </Link>
                ))}
            </div>

            <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-400">
                {adminCopy.overview.recentReports}
            </h2>
            <AdminTable>
                <AdminTableHead>
                    <AdminTh>{adminCopy.bugReports.columns.when}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.user}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.zone}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.status}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.description}</AdminTh>
                </AdminTableHead>
                <AdminTableBody>
                    {recent_reports.length === 0 ? (
                        <AdminEmptyRow colSpan={5} message={adminCopy.overview.noRecent} />
                    ) : (
                        recent_reports.map((report) => (
                            <tr key={report.id}>
                                <AdminTd className="whitespace-nowrap text-slate-500 dark:text-neutral-400">
                                    {formatAdminDate(report.created_at)}
                                </AdminTd>
                                <AdminTd>
                                    <p className="font-medium text-slate-900 dark:text-neutral-50">{report.user?.name ?? '—'}</p>
                                    <p className="text-xs text-slate-400 dark:text-neutral-400">{report.user?.email}</p>
                                </AdminTd>
                                <AdminTd>{adminCopy.zones[report.zone]}</AdminTd>
                                <AdminTd>
                                    <StatusChip
                                        label={adminCopy.statuses[report.status]}
                                        color={bugReportStatusColor(report.status)}
                                    />
                                </AdminTd>
                                <AdminTd className="max-w-xs">
                                    <p className="line-clamp-2">{report.description}</p>
                                </AdminTd>
                            </tr>
                        ))
                    )}
                </AdminTableBody>
            </AdminTable>
        </AdminLayout>
    );
}
