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

/** Format a money amount with Intl; falls back to en-US on invalid currency/locale. */
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
