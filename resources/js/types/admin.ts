import { type BugReportStatus, type BugReportType, type BugReportView, type BugReportZone } from '@/types/api';

export interface AdminReportUser {
    id: number;
    name: string;
    email: string;
}

export interface AdminBugReport {
    id: number;
    type: BugReportType;
    zone: BugReportZone;
    view: BugReportView;
    status: BugReportStatus;
    description: string;
    created_at: string;
    user: AdminReportUser | null;
}

export interface AdminUserRow {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    currency: string;
    locale: string | null;
    is_admin: boolean;
    email_verified_at: string | null;
    onboarded_at: string | null;
    created_at: string;
}

export interface AdminPaginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}
