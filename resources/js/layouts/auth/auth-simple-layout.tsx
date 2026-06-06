import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div
            className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] flex min-h-svh flex-col items-center justify-center bg-slate-200 bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-neutral-950"
        >
            <AppearanceToggleDropdown className="fixed top-4 left-4 z-20" />

            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    {/* Card */}
                    <div className="rounded-2xl bg-white px-8 py-8 shadow-[0_4px_32px_rgba(0,0,0,0.10)] dark:bg-neutral-900 dark:shadow-[0_4px_40px_rgba(0,0,0,0.60)] dark:ring-1 dark:ring-neutral-800/60">
                        <div className="mb-6 space-y-1 text-center">
                            {title && <h1 className="text-xl font-semibold text-slate-900 dark:text-neutral-50">{title}</h1>}
                            {description && <p className="text-sm text-slate-500 dark:text-neutral-300">{description}</p>}
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
