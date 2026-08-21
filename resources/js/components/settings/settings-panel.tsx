import { apiFetch, errorMessage } from '@/api/client';
import AppearanceTabs from '@/components/appearance-tabs';
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
        return 'Never';
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

/** Shared settings body — used by desktop drawer and mobile Settings card. */
export default function SettingsPanel({ idPrefix = 'settings' }: { idPrefix?: string }) {
    const { auth, flash } = usePage<SharedData>().props;
    const user = auth.user;
    const { notifyFinanceMutated } = useFinanceData();

    const [moneyBusy, setMoneyBusy] = useState(false);
    const [moneyError, setMoneyError] = useState<string | null>(null);
    const [syncBusy, setSyncBusy] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const patchProfile = (partial: { currency?: string; locale?: string | null }) => {
        setMoneyBusy(true);
        setMoneyError(null);

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
                onError: (errors) => {
                    setMoneyError(errors.currency ?? errors.locale ?? 'Could not update.');
                },
                onFinish: () => setMoneyBusy(false),
            },
        );
    };

    const handleSync = async () => {
        setSyncBusy(true);
        setSyncError(null);
        setSyncMessage(null);

        try {
            const result = await apiFetch<{ closed_months: string[]; skipped: boolean }>(
                '/api/v1/finance/sync',
                { method: 'POST' },
            );

            notifyFinanceMutated();
            router.reload({ only: ['auth'] });

            if (result.skipped) {
                setSyncMessage('Sync skipped — another process is already running.');
            } else if (result.closed_months.length > 0) {
                setSyncMessage(`Synced. Closed: ${result.closed_months.join(', ')}`);
            } else {
                setSyncMessage('Synced. No months needed closing.');
            }
        } catch (err: unknown) {
            setSyncError(errorMessage(err));
        } finally {
            setSyncBusy(false);
        }
    };

    return (
        <div className="space-y-5">
            <Section title="Account">
                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true, preserveState: true }}
                    className="space-y-3"
                >
                    {({ processing, recentlySuccessful, errors }) => (
                        <>
                            <input type="hidden" name="currency" value={user.currency ?? 'USD'} />
                            <input type="hidden" name="locale" value={user.locale ?? ''} />

                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`${idPrefix}-first-name`}>First name</Label>
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
                                    <Label htmlFor={`${idPrefix}-last-name`}>Last name</Label>
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
                                <Label htmlFor={`${idPrefix}-email`}>Email</Label>
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
                                    Email unverified.{' '}
                                    <Link
                                        href={send()}
                                        as="button"
                                        className="text-foreground underline underline-offset-4"
                                    >
                                        Resend verification
                                    </Link>
                                </p>
                            )}

                            {flash?.status === 'verification-link-sent' && (
                                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Verification link sent.
                                </p>
                            )}

                            <div className="flex items-center gap-3">
                                <Button type="submit" size="sm" disabled={processing}>
                                    Save
                                </Button>
                                {recentlySuccessful && (
                                    <span className="text-sm text-muted-foreground">Saved</span>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </Section>

            <Section title="Money display">
                <div className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor={`${idPrefix}-currency`}>Currency</Label>
                        <select
                            id={`${idPrefix}-currency`}
                            className={selectCls}
                            value={user.currency ?? 'USD'}
                            disabled={moneyBusy}
                            onChange={(e) => patchProfile({ currency: e.target.value })}
                        >
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                        </select>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor={`${idPrefix}-locale`}>Number format</Label>
                        <select
                            id={`${idPrefix}-locale`}
                            className={selectCls}
                            value={user.locale ?? ''}
                            disabled={moneyBusy}
                            onChange={(e) =>
                                patchProfile({ locale: e.target.value === '' ? null : e.target.value })
                            }
                        >
                            <option value="">Browser default</option>
                            {SUPPORTED_LOCALES.map((loc) => (
                                <option key={loc.value} value={loc.value}>
                                    {loc.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {moneyError && <p className="text-sm text-destructive">{moneyError}</p>}
                    {moneyBusy && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Updating…
                        </p>
                    )}
                </div>
            </Section>

            <Section title="Appearance">
                <AppearanceTabs />
            </Section>

            <Section title="Finance">
                <p className="text-sm text-muted-foreground">
                    Last processed:{' '}
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
                    Sync now
                </Button>
                {syncMessage && <p className="text-sm text-muted-foreground">{syncMessage}</p>}
                {syncError && <p className="text-sm text-destructive">{syncError}</p>}
            </Section>

            <Section title="Security">
                <Form
                    {...PasswordController.update.form()}
                    options={{ preserveScroll: true, preserveState: true }}
                    resetOnError={['password', 'password_confirmation', 'current_password']}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) passwordInput.current?.focus();
                        if (errors.current_password) currentPasswordInput.current?.focus();
                    }}
                    className="space-y-3"
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`${idPrefix}-current-password`}>Current password</Label>
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
                                <Label htmlFor={`${idPrefix}-password`}>New password</Label>
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
                                    Update password
                                </Button>
                                {recentlySuccessful && (
                                    <span className="text-sm text-muted-foreground">Saved</span>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </Section>

            <Section title="Session">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.post(logout().url)}
                >
                    <LogOut className="h-4 w-4" />
                    Log out
                </Button>
            </Section>

            <DeleteUser />
        </div>
    );
}
