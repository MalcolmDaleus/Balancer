import { apiFetch, errorMessage } from '@/api/client';
import AppearanceTabs from '@/components/appearance-tabs';
import { dashboardCopy } from '@/config/dashboard-copy';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinanceData } from '@/contexts/finance-data';
import { SUPPORTED_LOCALES } from '@/lib/money';
import { type SharedData } from '@/types';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import { send } from '@/routes/verification';
import { logout } from '@/routes';
import { Form, Link, router, usePage } from '@inertiajs/react';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useDashboardDensity, type DashboardDensity } from '@/hooks/use-dashboard-density';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';

const selectCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3 border-b border-border/60 pb-5 last:border-b-0">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
            {children}
        </section>
    );
}

function formatProcessedAt(iso: string | null | undefined): string {
    if (!iso) {
        return dashboardCopy.settings.never;
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

function DashboardDensityTabs() {
    const { density, updateDensity } = useDashboardDensity();
    const tabs: { value: DashboardDensity; label: string }[] = [
        { value: 'comfortable', label: dashboardCopy.settings.layoutBig },
        { value: 'compact', label: dashboardCopy.settings.layoutSmall },
    ];

    return (
        <div className="inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {tabs.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateDensity(value)}
                    className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${
                        density === value
                            ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                            : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/** Shared settings body — used by desktop drawer and mobile Settings card. */
export default function SettingsPanel({ idPrefix = 'settings' }: { idPrefix?: string }) {
    const { auth, flash, isLocal } = usePage<SharedData>().props;
    const user = auth.user;
    const { notifyFinanceMutated } = useFinanceData();

    const [moneyBusy, setMoneyBusy] = useState(false);
    const [syncBusy, setSyncBusy] = useState(false);

    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const patchProfile = (partial: { currency?: string; locale?: string | null }) => {
        setMoneyBusy(true);

        router.patch(
            ProfileController.update.url(),
            {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                currency: partial.currency ?? user.currency,
                locale: partial.locale === undefined ? (user.locale ?? '') : (partial.locale ?? ''),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => toastSuccess(dashboardCopy.settings.saved),
                onError: (errors) => {
                    toastError(errors.currency ?? errors.locale ?? dashboardCopy.settings.couldNotUpdate);
                },
                onFinish: () => setMoneyBusy(false),
            },
        );
    };

    const handleSync = async () => {
        setSyncBusy(true);

        try {
            const result = await apiFetch<{ closed_months: string[]; skipped: boolean }>(
                '/api/v1/finance/sync',
                { method: 'POST', toast: false },
            );

            notifyFinanceMutated();
            router.reload({ only: ['auth'] });

            if (result.skipped) {
                toastWarning(dashboardCopy.settings.syncSkipped);
            } else if (result.closed_months.length > 0) {
                toastSuccess(dashboardCopy.settings.syncedClosed(result.closed_months.join(', ')));
            } else {
                toastSuccess(dashboardCopy.settings.synced);
            }
        } catch (err: unknown) {
            toastError(errorMessage(err));
        } finally {
            setSyncBusy(false);
        }
    };

    return (
        <div className="space-y-5">
            <Section title={dashboardCopy.settings.sections.account}>
                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true, preserveState: true }}
                    onSuccess={() => toastSuccess(dashboardCopy.settings.saved)}
                    onError={() => toastError(dashboardCopy.settings.couldNotSaveProfile)}
                    className="space-y-3"
                >
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="currency" value={user.currency ?? 'USD'} />
                            <input type="hidden" name="locale" value={user.locale ?? ''} />

                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`${idPrefix}-first-name`}>{dashboardCopy.settings.firstName}</Label>
                                    <Input
                                        id={`${idPrefix}-first-name`}
                                        name="first_name"
                                        defaultValue={user.first_name}
                                        required
                                        autoComplete="given-name"
                                    />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`${idPrefix}-last-name`}>{dashboardCopy.settings.lastName}</Label>
                                    <Input
                                        id={`${idPrefix}-last-name`}
                                        name="last_name"
                                        defaultValue={user.last_name}
                                        required
                                        autoComplete="family-name"
                                    />
                                    <InputError message={errors.last_name} />
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor={`${idPrefix}-email`}>{dashboardCopy.settings.email}</Label>
                                <Input
                                    id={`${idPrefix}-email`}
                                    type="email"
                                    name="email"
                                    defaultValue={user.email}
                                    required
                                    autoComplete="username"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {user.email_verified_at === null && (
                                <p className="text-sm text-muted-foreground">
                                    {dashboardCopy.settings.emailUnverified}{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        {dashboardCopy.settings.resendVerification}
                                    </Link>
                                </p>
                            )}

                            {flash?.status === 'verification-link-sent' && (
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {dashboardCopy.settings.verificationSent}
                                </p>
                            )}

                            <div className="flex items-center gap-3">
                                <Button type="submit" size="sm" disabled={processing}>
                                    {dashboardCopy.settings.save}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Section>

            <Section title={dashboardCopy.settings.sections.money}>
                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor={`${idPrefix}-currency`}>{dashboardCopy.settings.currency}</Label>
                        <select
                            id={`${idPrefix}-currency`}
                            className={selectCls}
                            value={user.currency ?? 'USD'}
                            disabled={moneyBusy}
                            onChange={(e) => patchProfile({ currency: e.target.value })}
                        >
                            <option value="USD">{dashboardCopy.settings.usd}</option>
                            <option value="EUR">{dashboardCopy.settings.eur}</option>
                        </select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor={`${idPrefix}-locale`}>{dashboardCopy.settings.numberFormat}</Label>
                        <select
                            id={`${idPrefix}-locale`}
                            className={selectCls}
                            value={user.locale ?? ''}
                            disabled={moneyBusy}
                            onChange={(e) =>
                                patchProfile({ locale: e.target.value === '' ? null : e.target.value })
                            }
                        >
                            <option value="">{dashboardCopy.settings.browserDefault}</option>
                            {SUPPORTED_LOCALES.map((loc) => (
                                <option key={loc.value} value={loc.value}>
                                    {loc.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {moneyBusy && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {dashboardCopy.settings.updating}
                        </p>
                    )}
                </div>
            </Section>

            <Section title={dashboardCopy.settings.sections.appearance}>
                <AppearanceTabs />
            </Section>

            <Section title={dashboardCopy.settings.sections.layout}>
                <DashboardDensityTabs />
                <p className="text-sm text-muted-foreground">
                    {dashboardCopy.settings.layoutHint}
                </p>
            </Section>

            <Section title={dashboardCopy.settings.sections.tour}>
                <p className="text-sm text-muted-foreground">
                    {dashboardCopy.settings.tourHint}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => router.visit('/onboarding')}>
                    {dashboardCopy.settings.showTour}
                </Button>
            </Section>

            {isLocal && (
                <Section title={dashboardCopy.settings.sections.local}>
                    <p className="text-sm text-muted-foreground">
                        {dashboardCopy.settings.localHint}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (window.confirm(dashboardCopy.settings.resetConfirm)) {
                                    router.post('/dev/reset-onboarding');
                                }
                            }}
                        >
                            {dashboardCopy.settings.resetOnboarding}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (window.confirm(dashboardCopy.settings.loadDemoConfirm)) {
                                    router.post('/dev/load-demo');
                                }
                            }}
                        >
                            {dashboardCopy.settings.loadDemo}
                        </Button>
                    </div>
                </Section>
            )}

            <Section title={dashboardCopy.settings.sections.finance}>
                <p className="text-sm text-muted-foreground">
                    {dashboardCopy.settings.lastProcessed}{' '}
                    <span className="text-foreground">
                        {formatProcessedAt(user.last_finance_processed_at)}
                    </span>
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={syncBusy}
                    onClick={() => void handleSync()}
                    className="gap-1.5"
                >
                    {syncBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    {dashboardCopy.settings.syncNow}
                </Button>
            </Section>

            <Section title={dashboardCopy.settings.sections.security}>
                <Form
                    {...PasswordController.update.form()}
                    options={{ preserveScroll: true, preserveState: true }}
                    resetOnError={['password', 'password_confirmation', 'current_password']}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) passwordInput.current?.focus();
                        if (errors.current_password) currentPasswordInput.current?.focus();
                        toastError(errors.current_password ?? errors.password ?? errors.password_confirmation ?? dashboardCopy.settings.couldNotUpdatePassword);
                    }}
                    onSuccess={() => toastSuccess(dashboardCopy.settings.passwordUpdated)}
                    className="space-y-3"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`${idPrefix}-current-password`}>{dashboardCopy.settings.currentPassword}</Label>
                                <Input
                                    id={`${idPrefix}-current-password`}
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    type="password"
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.current_password} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`${idPrefix}-password`}>{dashboardCopy.settings.newPassword}</Label>
                                <Input
                                    id={`${idPrefix}-password`}
                                    ref={passwordInput}
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.password} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`${idPrefix}-password-confirm`}>Confirm password</Label>
                                <Input
                                    id={`${idPrefix}-password-confirm`}
                                    name="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button type="submit" size="sm" disabled={processing}>
                                    {dashboardCopy.settings.updatePassword}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Section>

            <Section title={dashboardCopy.settings.sections.session}>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.post(logout().url)}
                >
                    <LogOut className="h-4 w-4" />
                    {dashboardCopy.settings.logOut}
                </Button>
            </Section>

            <DeleteUser />
        </div>
    );
}
