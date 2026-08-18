import { formatMoney } from '@/lib/money';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** Format amounts using the authenticated user's currency and locale. */
export function useFormatMoney() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    return (amount: number) => formatMoney(amount, user.currency ?? 'USD', user.locale);
}
