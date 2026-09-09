/** Curated locales matching App\Support\SupportedLocales. */
export const SUPPORTED_LOCALES = [
    { value: 'en-US', label: 'English (US) — 1,234.56' },
    { value: 'en-GB', label: 'English (UK) — 1,234.56' },
    { value: 'de-DE', label: 'Deutsch — 1.234,56' },
    { value: 'fr-FR', label: 'Français — 1 234,56' },
    { value: 'nl-NL', label: 'Nederlands — 1.234,56' },
    { value: 'es-ES', label: 'Español — 1.234,56' },
    { value: 'it-IT', label: 'Italiano — 1.234,56' },
    { value: 'pt-PT', label: 'Português — 1 234,56' },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['value'];

/** Prefer saved locale, then browser language, then en-US. */
export function resolveLocale(userLocale?: string | null): string {
    if (userLocale) return userLocale;
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
    }
    return 'en-US';
}

/** Currency symbol for prefixed amount fields (€, $). */
export function currencySymbol(currency: string, locale?: string | null): string {
    try {
        const parts = new Intl.NumberFormat(resolveLocale(locale), {
            style: 'currency',
            currency,
        }).formatToParts(0);
        return parts.find((p) => p.type === 'currency')?.value ?? currency;
    } catch {
        return currency;
    }
}

/** Integer cents → major units for Intl only. */
export function centsToMajor(cents: number): number {
    return cents / 100;
}

function decimalSeparator(locale?: string | null): ',' | '.' {
    const sample = new Intl.NumberFormat(resolveLocale(locale), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(1.1);
    return sample.includes(',') ? ',' : '.';
}

/**
 * Parse a user amount field into cents.
 * Empty → null. Invalid or a third fractional digit → NaN.
 */
export function majorInputToCents(raw: string, locale?: string | null): number | null {
    const trimmed = raw.trim().replace(/\u00a0/g, ' ');
    if (trimmed === '') {
        return null;
    }

    const dec = decimalSeparator(locale);
    const thou = dec === ',' ? '.' : ',';
    let s = trimmed.replace(/ /g, '');
    if (s.startsWith('+')) {
        s = s.slice(1);
    }
    if (s.startsWith('-') || s === '') {
        return Number.NaN;
    }

    const lastDec = s.lastIndexOf(dec);
    let whole: string;
    let frac = '';
    if (lastDec >= 0) {
        whole = s.slice(0, lastDec).split(thou).join('');
        frac = s.slice(lastDec + 1).split(thou).join('');
    } else {
        whole = s.split(thou).join('');
    }

    if (frac.length > 2) {
        return Number.NaN;
    }
    if (!/^\d+$/.test(whole) || (frac !== '' && !/^\d+$/.test(frac))) {
        return Number.NaN;
    }

    return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

export function centsToInput(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) {
        return '';
    }
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    const whole = Math.trunc(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    return `${sign}${whole}.${frac}`;
}

export function formatMoney(amount: number, currency: string, locale?: string | null): string {
    const resolved = resolveLocale(locale);
    try {
        return new Intl.NumberFormat(resolved, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    } catch {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    }
}

export function formatMoneyFromCents(cents: number, currency: string, locale?: string | null): string {
    return formatMoney(centsToMajor(cents), currency, locale);
}
