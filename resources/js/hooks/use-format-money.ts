import { formatMoneyFromCents } from '@/lib/money';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** Format integer cents using the authenticated user's currency and locale. */
export function useFormatMoney() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    return (cents: number) => formatMoneyFromCents(cents, user.currency ?? 'USD', user.locale);
}
