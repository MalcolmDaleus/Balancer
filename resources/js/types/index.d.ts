import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    auth: Auth;
    sidebarOpen: boolean;
    isLocal?: boolean;
    flash?: {
        status?: string | null;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    currency: 'USD' | 'EUR' | string;
    /** Saved number-format locale; null → browser default via resolveLocale(). */
    locale: string | null;
    /** ISO timestamp of last successful finance process/sync, or null. */
    last_finance_processed_at?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    onboarded_at?: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
