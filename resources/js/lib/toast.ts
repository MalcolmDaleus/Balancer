export type ToastKind = 'success' | 'error' | 'warning';

export type ToastItem = {
    id: number;
    kind: ToastKind;
    message: string;
};

type Listener = (toast: Omit<ToastItem, 'id'>) => void;

let listener: Listener | null = null;
let nextId = 1;

export function setToastListener(cb: Listener | null): void {
    listener = cb;
}

export function toast(kind: ToastKind, message: string): void {
    listener?.({ kind, message });
}

export function toastSuccess(message: string): void {
    toast('success', message);
}

export function toastError(message: string): void {
    toast('error', message);
}

export function toastWarning(message: string): void {
    toast('warning', message);
}

export function nextToastId(): number {
    nextId += 1;
    return nextId;
}
