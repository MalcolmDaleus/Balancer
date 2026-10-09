import { errorCopy, type ErrorStatus } from '@/config/error-copy';
import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';

export default function ErrorPage({ status }: { status: ErrorStatus }) {
    const page = errorCopy.pages[status] ?? errorCopy.pages[500];
    const retryable = status === 500 || status === 503;

    return (
        <PublicLayout>
            <Head title={page.title} />
            <div className="mx-auto flex max-w-md flex-col px-5 py-20 sm:py-28">
                <div className="rounded-[1.6rem] bg-white p-8 text-center shadow-[0_8px_40px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/8">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase tabular-nums dark:text-neutral-400">
                        {status}
                    </p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">{page.title}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">{page.body}</p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                        {retryable ? (
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
                            >
                                {errorCopy.reload}
                            </button>
                        ) : null}
                        {/* Full page load: the error may have come from a broken client state. */}
                        <a
                            href="/"
                            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                        >
                            {errorCopy.home}
                        </a>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
