import { toastError, toastSuccess } from '@/lib/toast';

function isWrite(method: string): boolean {
    const m = method.toUpperCase();
    return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

export function emitApiToasts(
    method: string,
    toastOpt: false | string | undefined,
    result: { ok: true } | { ok: false; message: string },
): void {
    if (toastOpt === false) {
        return;
    }

    if (!result.ok) {
        if (isWrite(method) || toastOpt !== undefined) {
            toastError(result.message);
        }
        return;
    }

    if (typeof toastOpt === 'string') {
        toastSuccess(toastOpt);
        return;
    }

    if (isWrite(method)) {
        toastSuccess('Saved');
    }
}
