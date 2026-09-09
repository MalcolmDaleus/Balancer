import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

const STILL = '/img/landing/elementor-placeholder-image.png';

const BEATS = [
    {
        title: 'Record it in the Ledger',
        body: 'Purchases, income, recurring, debts, and savings are Facts you type. Recurring streams and pay schedules generate the repeats so you are not retyping rent every month.',
        image: STILL,
    },
    {
        title: 'See the month',
        body: 'Balance Sheet is what moved this month. Statistics is what’s typical. Past months stay locked once you close them.',
        image: STILL,
    },
    {
        title: 'Plan what’s left',
        body: 'Set one monthly amount for day-to-day purchases if you want. You can always overspend; the card just shows what’s left.',
        image: STILL,
    },
] as const;

const headerBtn =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition';
const primaryBtn = `${headerBtn} bg-slate-800 text-white shadow-sm hover:bg-slate-700 dark:bg-slate-100 dark:text-neutral-900 dark:hover:bg-white`;
const ghostBtn = `${headerBtn} text-slate-700 hover:bg-white/70 dark:text-neutral-200 dark:hover:bg-white/10`;

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user ?? null;
    const appHome = user?.onboarded_at ? dashboard() : '/onboarding';

    return (
        <>
            <Head title="Balancer" />

            <div className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] min-h-svh bg-slate-200 bg-cover bg-center bg-no-repeat dark:bg-neutral-950">
                <header className="sticky top-0 z-20 border-b border-slate-900/5 bg-slate-200/70 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/70">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                        <Link href="/" className="min-w-0 shrink">
                            <img
                                src="/branding/logo_dark.svg"
                                alt="Balancer"
                                className="h-8 w-auto dark:hidden"
                            />
                            <img
                                src="/branding/logo_light.svg"
                                alt="Balancer"
                                className="hidden h-8 w-auto dark:block"
                            />
                        </Link>
                        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                            <AppearanceToggleDropdown />
                            {user ? (
                                <Link href={appHome} className={primaryBtn}>
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href={login()} className={ghostBtn}>
                                        Log in
                                    </Link>
                                    <Link href={register()} className={primaryBtn}>
                                        Sign up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:gap-14 lg:py-20">
                    <section className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:bg-neutral-900 dark:shadow-[0_8px_48px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-neutral-800/60">
                        <div className="grid md:grid-cols-[3fr_2fr]">
                            <div className="flex flex-col justify-center gap-6 px-8 py-10 sm:px-12 md:py-16 lg:px-16">
                                <div className="space-y-4">
                                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-neutral-50">
                                        Your month, in one place
                                    </h1>
                                    <p className="text-base leading-relaxed text-slate-600 sm:text-lg dark:text-neutral-300">
                                        What came in, what went out, what’s left, and what you meant to spend.
                                    </p>
                                    <p className="text-sm leading-relaxed text-slate-500 sm:text-base dark:text-neutral-400">
                                        Balancer is not a bank connection. You write it down. We keep the month tidy.
                                    </p>
                                </div>
                                {!user && (
                                    <div>
                                        <Link href={register()} className={`${primaryBtn} px-5 py-2.5`}>
                                            Sign up
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 pt-0 md:p-6 md:pl-3">
                                <div className="h-48 overflow-hidden rounded-2xl bg-slate-100 md:h-full md:min-h-[20rem] dark:bg-neutral-800">
                                    <img src={STILL} alt="" className="h-full w-full object-cover" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {BEATS.map((beat, i) => (
                        <section
                            key={beat.title}
                            className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:bg-neutral-900 dark:shadow-[0_8px_48px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-neutral-800/60"
                        >
                            <div
                                className={`grid md:grid-cols-[3fr_2fr] ${
                                    i % 2 === 1 ? 'md:[&>div:first-child]:order-last' : ''
                                }`}
                            >
                                <div className="flex flex-col justify-center gap-3 px-8 py-8 sm:px-12 md:py-12 lg:px-16">
                                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">
                                        {i === 0 ? 'Ledger' : i === 1 ? 'Balance Sheet' : 'Budget'}
                                    </p>
                                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl dark:text-neutral-50">
                                        {beat.title}
                                    </h2>
                                    <p className="text-sm leading-relaxed text-slate-600 md:text-base md:leading-7 dark:text-neutral-300">
                                        {beat.body}
                                    </p>
                                </div>
                                <div className="order-first p-4 pb-0 md:order-none md:p-6">
                                    <div className="h-40 overflow-hidden rounded-2xl bg-slate-100 md:h-full md:min-h-[16rem] dark:bg-neutral-800">
                                        <img src={beat.image} alt="" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}

                    <section className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:bg-neutral-900 dark:shadow-[0_8px_48px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-neutral-800/60">
                        <div className="grid md:grid-cols-[3fr_2fr]">
                            <div className="flex flex-col justify-center gap-3 px-8 py-8 sm:px-12 md:py-12 lg:px-16">
                                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">
                                    Available cash
                                </p>
                                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl dark:text-neutral-50">
                                    We remember what you have
                                </h2>
                                <p className="text-sm leading-relaxed text-slate-600 md:text-base md:leading-7 dark:text-neutral-300">
                                    Two starting numbers: spendable cash on hand, and money already in savings. Each month’s leftover updates your available cash. A savings deposit moves cash into savings — we do not invent income for that.
                                </p>
                            </div>
                            <div className="order-first p-4 pb-0 md:order-none md:p-6 md:pl-3">
                                <div className="h-40 overflow-hidden rounded-2xl bg-slate-100 md:h-full md:min-h-[16rem] dark:bg-neutral-800">
                                    <img src={STILL} alt="" className="h-full w-full object-cover" />
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
