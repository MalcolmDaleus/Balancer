import { type BugReportStatus, type BugReportType, type BugReportView, type BugReportZone } from '@/types/api';

export const adminPaths = {
    overview: '/admin',
    bugReports: '/admin/bug-reports',
    users: '/admin/users',
    admins: '/admin/admins',
} as const;

export const adminCopy = {
    nav: {
        dashboard: 'Back to dashboard',
        overview: 'Overview',
        bugReports: 'Bug reports',
        users: 'Users',
        admins: 'Admins',
    },
    overview: {
        headTitle: 'Admin',
        title: 'Admin',
        subtitle: 'Support and account operations',
        users: 'Users',
        admins: 'Admins',
        bugReports: 'Bug reports',
        newReports: 'New reports',
        recentReports: 'Recent reports',
        noRecent: 'No bug reports yet.',
    },
    bugReports: {
        headTitle: 'Bug reports',
        title: 'Bug reports',
        subtitle: 'Triage incoming reports',
        empty: 'No bug reports match this filter.',
        allStatuses: 'All statuses',
        columns: {
            when: 'When',
            user: 'User',
            type: 'Type',
            zone: 'Zone',
            view: 'View',
            status: 'Status',
            description: 'Description',
        },
    },
    users: {
        headTitle: 'Users',
        title: 'Users',
        subtitle: 'Everyone with an account',
        empty: 'No users yet.',
    },
    admins: {
        headTitle: 'Admins',
        title: 'Admins',
        subtitle: 'People who can open this area',
        empty: 'No admins yet.',
    },
    userColumns: {
        name: 'Name',
        email: 'Email',
        currency: 'Currency',
        verified: 'Verified',
        onboarded: 'Onboarded',
        role: 'Role',
        created: 'Created',
    },
    role: {
        admin: 'Admin',
        member: 'Member',
    },
    yes: 'Yes',
    no: 'No',
    previous: 'Previous',
    next: 'Next',
    page: (current: number, last: number) => `Page ${current} of ${last}`,
    statuses: {
        new: 'New',
        triaged: 'Triaged',
        fixed: 'Fixed',
        wont_fix: 'Won’t fix',
    } satisfies Record<BugReportStatus, string>,
    types: {
        visual: 'Visual',
        functional: 'Functional',
        composite: 'Composite',
    } satisfies Record<BugReportType, string>,
    zones: {
        'balance-sheet': 'Balance sheet',
        'creator-suite': 'Ledger',
        statistics: 'Statistics',
        budget: 'Budget',
        'past-balance-sheets': 'Past balance sheets',
        settings: 'Settings',
        dashboard: 'Dashboard',
        login: 'Login',
        other: 'Other',
    } satisfies Record<BugReportZone, string>,
    views: {
        desktop: 'Desktop',
        mobile: 'Mobile',
    } satisfies Record<BugReportView, string>,
};

export function formatAdminDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}
