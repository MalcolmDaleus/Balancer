import { adminCopy } from '@/config/admin-copy';
import { StatusChip } from '@/components/creator-suite/shared';
import { type AdminPaginator } from '@/types/admin';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

export function AdminTable({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">{children}</table>
        </div>
    );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
    return (
        <thead>
            <tr className="border-b border-slate-200 dark:border-neutral-800">{children}</tr>
        </thead>
    );
}

export function AdminTh({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <th
            className={`px-3 py-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-400 ${className}`}
        >
            {children}
        </th>
    );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
    return <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">{children}</tbody>;
}

export function AdminTd({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <td className={`px-3 py-3 align-top text-sm text-slate-700 dark:text-neutral-200 ${className}`}>{children}</td>;
}

export function AdminEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-slate-400 dark:text-neutral-400">
                {message}
            </td>
        </tr>
    );
}

export function AdminPagination<T>({ paginator }: { paginator: AdminPaginator<T> }) {
    if (paginator.last_page <= 1) {
        return null;
    }

    return (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-neutral-400">
            <p>{adminCopy.page(paginator.current_page, paginator.last_page)}</p>
            <div className="flex gap-2">
                {paginator.prev_page_url ? (
                    <Link
                        href={paginator.prev_page_url}
                        preserveScroll
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                    >
                        {adminCopy.previous}
                    </Link>
                ) : null}
                {paginator.next_page_url ? (
                    <Link
                        href={paginator.next_page_url}
                        preserveScroll
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                    >
                        {adminCopy.next}
                    </Link>
                ) : null}
            </div>
        </div>
    );
}

export function AdminRoleChip({ isAdmin }: { isAdmin: boolean }) {
    return (
        <StatusChip
            label={isAdmin ? adminCopy.role.admin : adminCopy.role.member}
            color={isAdmin ? 'violet' : 'slate'}
        />
    );
}

export function bugReportStatusColor(
    status: 'new' | 'triaged' | 'fixed' | 'wont_fix',
): 'amber' | 'blue' | 'green' | 'slate' {
    if (status === 'new') {
        return 'amber';
    }
    if (status === 'triaged') {
        return 'blue';
    }
    if (status === 'fixed') {
        return 'green';
    }

    return 'slate';
}
