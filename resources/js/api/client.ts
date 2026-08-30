/**
 * Shared API client for Creator Suite / dashboard.
 * Centralizes JSON fetch, validation errors, and 423 month_locked handling.
 */

import { emitApiToasts } from '@/lib/api-toasts';

export type ApiErrorBody = {
    error?: string;
    message?: string;
    details?: Record<string, string[]>;
    month?: string;
};

export class ApiClientError extends Error {
    status: number;
    error: string;
    details?: Record<string, string[]>;
    month?: string;

    constructor(
        status: number,
        message: string,
        opts?: { error?: string; details?: Record<string, string[]>; month?: string },
    ) {
        super(message);
        this.name = 'ApiClientError';
        this.status = status;
        this.error = opts?.error ?? (status === 423 ? 'month_locked' : 'error');
        this.details = opts?.details;
        this.month = opts?.month;
    }
}

/** Prefer over `err: any` in catch blocks. */
export function isNotFound(err: unknown): boolean {
    return err instanceof ApiClientError && err.status === 404;
}

export function errorMessage(err: unknown): string {
    if (err instanceof ApiClientError) return err.message;
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Something went wrong.';
}

/** Unwrap Laravel resource / toggle payloads `{ data: T }` or bare `T`. */
export function unwrapData<T>(res: T | { data: T }): T {
    if (res !== null && typeof res === 'object' && 'data' in res) {
        return (res as { data: T }).data;
    }
    return res as T;
}

type FinanceMutationListener = () => void;
let financeMutationListener: FinanceMutationListener | null = null;

/** Dashboard registers this so successful mutations refresh the balance sheet. */
export function setFinanceMutationListener(cb: FinanceMutationListener | null): void {
    financeMutationListener = cb;
}

function notifyMutationIfNeeded(method: string, ok: boolean): void {
    if (!ok || !financeMutationListener) return;
    const m = method.toUpperCase();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return;
    financeMutationListener();
}

function joinDetails(details: Record<string, string[]>): string {
    return Object.values(details).flat().join(' · ');
}

export type ApiFetchOptions = RequestInit & {
    notifyFinance?: boolean;
    /** Success copy. Writes also toast errors unless `false`. */
    toast?: false | string;
};

export async function apiFetch<T = unknown>(url: string, options?: ApiFetchOptions): Promise<T> {
    const { notifyFinance = true, toast: toastOpt, ...init } = options ?? {};
    const method = init.method ?? 'GET';
    const res = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...init.headers,
        },
        credentials: 'same-origin',
    });

    if (res.status === 204) {
        emitApiToasts(method, toastOpt, { ok: true });
        if (notifyFinance) {
            notifyMutationIfNeeded(method, true);
        }
        return undefined as T;
    }

    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;

    if (!res.ok) {
        let err: ApiClientError;
        if (res.status === 422 && body?.details) {
            err = new ApiClientError(422, joinDetails(body.details), {
                error: body.error ?? 'validation_error',
                details: body.details,
                month: body.month,
            });
        } else if (res.status === 423) {
            err = new ApiClientError(423, body.message ?? 'This month is locked.', {
                error: body.error ?? 'month_locked',
                month: body.month,
            });
        } else {
            err = new ApiClientError(res.status, body.message ?? `HTTP ${res.status}`, {
                error: body.error,
                details: body.details,
                month: body.month,
            });
        }
        const silentDeleteMiss = method.toUpperCase() === 'DELETE' && res.status === 404;
        if (!silentDeleteMiss) {
            emitApiToasts(method, toastOpt, { ok: false, message: err.message });
        }
        throw err;
    }

    emitApiToasts(method, toastOpt, { ok: true });
    if (notifyFinance) {
        notifyMutationIfNeeded(method, true);
    }
    return body as T;
}

/** Unwrap Laravel resource collections `{ data: [...] }`. */
export async function apiFetchList<T>(url: string): Promise<T[]> {
    const res = await apiFetch<{ data: T[] } | T[]>(url);
    return Array.isArray(res) ? res : (res as { data: T[] }).data;
}
