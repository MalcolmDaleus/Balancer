import {
    AdminEmptyRow,
    AdminPagination,
    AdminTable,
    AdminTableBody,
    AdminTableHead,
    AdminTd,
    AdminTh,
    bugReportStatusColor,
} from '@/components/admin/admin-table';
import { selectCls, StatusChip } from '@/components/creator-suite/shared';
import { adminCopy, adminPaths, formatAdminDate } from '@/config/admin-copy';
import AdminLayout from '@/layouts/admin-layout';
import { type AdminBugReport, type AdminPaginator } from '@/types/admin';
import { type BugReportStatus } from '@/types/api';
import { router } from '@inertiajs/react';

const STATUSES: BugReportStatus[] = ['new', 'triaged', 'fixed', 'wont_fix'];

type BugReportsProps = {
    reports: AdminPaginator<AdminBugReport>;
    filters: {
        status: BugReportStatus | null;
    };
};

export default function AdminBugReports({ reports, filters }: BugReportsProps) {
    const filterStatus = (status: string) => {
        router.get(
            adminPaths.bugReports,
            status === '' ? {} : { status },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const updateStatus = (id: number, status: BugReportStatus) => {
        router.patch(`/admin/bug-reports/${id}`, { status }, { preserveScroll: true });
    };

    return (
        <AdminLayout
            title={adminCopy.bugReports.headTitle}
            heading={adminCopy.bugReports.title}
            subtitle={adminCopy.bugReports.subtitle}
            current="bug-reports"
            toolbar={
                <label className="block sm:w-48">
                    <span className="sr-only">{adminCopy.bugReports.columns.status}</span>
                    <select
                        className={selectCls}
                        value={filters.status ?? ''}
                        onChange={(event) => filterStatus(event.target.value)}
                    >
                        <option value="">{adminCopy.bugReports.allStatuses}</option>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {adminCopy.statuses[status]}
                            </option>
                        ))}
                    </select>
                </label>
            }
        >
            <AdminTable>
                <AdminTableHead>
                    <AdminTh>{adminCopy.bugReports.columns.when}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.user}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.type}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.zone}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.view}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.status}</AdminTh>
                    <AdminTh>{adminCopy.bugReports.columns.description}</AdminTh>
                </AdminTableHead>
                <AdminTableBody>
                    {reports.data.length === 0 ? (
                        <AdminEmptyRow colSpan={7} message={adminCopy.bugReports.empty} />
                    ) : (
                        reports.data.map((report) => (
                            <tr key={report.id}>
                                <AdminTd className="whitespace-nowrap text-slate-500 dark:text-neutral-400">
                                    {formatAdminDate(report.created_at)}
                                </AdminTd>
                                <AdminTd>
                                    <p className="font-medium text-slate-900 dark:text-neutral-50">{report.user?.name ?? '—'}</p>
                                    <p className="text-xs text-slate-400 dark:text-neutral-400">{report.user?.email}</p>
                                </AdminTd>
                                <AdminTd>{adminCopy.types[report.type]}</AdminTd>
                                <AdminTd>{adminCopy.zones[report.zone]}</AdminTd>
                                <AdminTd>{adminCopy.views[report.view]}</AdminTd>
                                <AdminTd>
                                    <div className="flex flex-col gap-2">
                                        <StatusChip
                                            label={adminCopy.statuses[report.status]}
                                            color={bugReportStatusColor(report.status)}
                                        />
                                        <select
                                            className={selectCls}
                                            value={report.status}
                                            aria-label={adminCopy.bugReports.columns.status}
                                            onChange={(event) => updateStatus(report.id, event.target.value as BugReportStatus)}
                                        >
                                            {STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {adminCopy.statuses[status]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </AdminTd>
                                <AdminTd className="max-w-sm">
                                    <p className="whitespace-pre-wrap">{report.description}</p>
                                </AdminTd>
                            </tr>
                        ))
                    )}
                </AdminTableBody>
            </AdminTable>
            <AdminPagination paginator={reports} />
        </AdminLayout>
    );
}
