import {
    AdminEmptyRow,
    AdminTable,
    AdminTableBody,
    AdminTableHead,
    AdminTd,
    AdminTh,
} from '@/components/admin/admin-table';
import { deleteBtnCls, Field, innerCardCls, inputCls, secondaryBtnCls, StatusChip } from '@/components/creator-suite/shared';
import { adminCopy, adminPaths, formatAdminDate } from '@/config/admin-copy';
import AdminLayout from '@/layouts/admin-layout';
import { type AdminGeneratedResetLink, type AdminPasswordReset } from '@/types/admin';
import { router, useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

type PasswordResetsProps = {
    resets: AdminPasswordReset[];
    generated: AdminGeneratedResetLink | null;
    expire_minutes: number;
};

const copy = adminCopy.passwordResets;

function GeneratedLink({ link }: { link: AdminGeneratedResetLink }) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className={`${innerCardCls} mb-6 p-4`}>
            <p className="text-sm font-semibold text-slate-900 dark:text-neutral-50">{copy.generatedTitle(link.name || link.email)}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-neutral-400">
                {link.email} · {copy.columns.expires} {formatAdminDate(link.expires_at)}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                    readOnly
                    value={link.url}
                    aria-label={copy.generatedTitle(link.email)}
                    onFocus={(event) => event.currentTarget.select()}
                    className={`${inputCls} font-mono text-sm`}
                />
                <button type="button" className={`${secondaryBtnCls} shrink-0`} onClick={copyLink}>
                    {copied ? copy.copied : copy.copy}
                </button>
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{copy.generatedHint}</p>
        </div>
    );
}

export default function AdminPasswordResets({ resets, generated, expire_minutes }: PasswordResetsProps) {
    const form = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(adminPaths.passwordResets, {
            preserveScroll: true,
            onSuccess: () => form.reset('email'),
        });
    };

    const revoke = (userId: number) => {
        router.delete(`${adminPaths.passwordResets}/${userId}`, { preserveScroll: true });
    };

    return (
        <AdminLayout title={copy.headTitle} heading={copy.title} subtitle={copy.subtitle} current="password-resets">
            <form onSubmit={submit} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="sm:w-80">
                    <Field label={copy.emailLabel} error={form.errors.email}>
                        <input
                            type="email"
                            required
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            placeholder={copy.emailPlaceholder}
                            className={inputCls}
                        />
                    </Field>
                </div>
                <button
                    type="submit"
                    disabled={form.processing}
                    className={`${secondaryBtnCls} self-start sm:mb-0.5 sm:self-auto`}
                >
                    {form.processing ? copy.creating : copy.create}
                </button>
            </form>

            {generated ? <GeneratedLink link={generated} /> : null}

            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-50">{copy.openLinks}</h2>
                <p className="text-xs text-slate-400 dark:text-neutral-400">{copy.validFor(expire_minutes)}</p>
            </div>
            <AdminTable>
                <AdminTableHead>
                    <AdminTh>{copy.columns.user}</AdminTh>
                    <AdminTh>{copy.columns.created}</AdminTh>
                    <AdminTh>{copy.columns.expires}</AdminTh>
                    <AdminTh>{copy.columns.status}</AdminTh>
                    <AdminTh>{copy.columns.actions}</AdminTh>
                </AdminTableHead>
                <AdminTableBody>
                    {resets.length === 0 ? (
                        <AdminEmptyRow colSpan={5} message={copy.empty} />
                    ) : (
                        resets.map((reset) => (
                            <tr key={reset.user_id}>
                                <AdminTd>
                                    <p className="font-medium text-slate-900 dark:text-neutral-50">{reset.name || '—'}</p>
                                    <p className="text-xs text-slate-400 dark:text-neutral-400">{reset.email}</p>
                                </AdminTd>
                                <AdminTd className="whitespace-nowrap text-slate-500 dark:text-neutral-400">
                                    {formatAdminDate(reset.created_at)}
                                </AdminTd>
                                <AdminTd className="whitespace-nowrap text-slate-500 dark:text-neutral-400">
                                    {formatAdminDate(reset.expires_at)}
                                </AdminTd>
                                <AdminTd>
                                    <StatusChip
                                        label={reset.expired ? copy.expired : copy.active}
                                        color={reset.expired ? 'slate' : 'green'}
                                    />
                                </AdminTd>
                                <AdminTd className="text-right">
                                    <button type="button" className={deleteBtnCls} onClick={() => revoke(reset.user_id)}>
                                        {copy.revoke}
                                    </button>
                                </AdminTd>
                            </tr>
                        ))
                    )}
                </AdminTableBody>
            </AdminTable>
        </AdminLayout>
    );
}
