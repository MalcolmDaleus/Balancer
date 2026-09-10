import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, LayoutDashboard, PiggyBank, Wallet } from 'lucide-react';

const STILL = '/img/landing/elementor-placeholder-image.png';

const BEATS = [
    {
        kicker: '01',
        name: 'Ledger',
        title: 'Record it',
        body: 'Purchases, income, recurring, debts, and savings are Facts you type. Recurring streams and pay schedules generate the repeats so you are not retyping rent every month.',
        icon: BookOpen,
        accent: 'bg-emerald-500',
        tint: 'text-emerald-700 dark:text-emerald-400',
    },
    {
        kicker: '02',
        name: 'Balance Sheet',
        title: 'See the month',
        body: 'Balance Sheet is what moved this month. Statistics is what’s typical. Past months stay locked once you close them.',
        icon: LayoutDashboard,
        accent: 'bg-yellow-500',
        tint: 'text-yellow-700 dark:text-yellow-400',
    },
    {
        kicker: '03',
        name: 'Budget',
        title: 'Plan what’s left',
        body: 'Set one monthly amount for day-to-day purchases if you want. You can always overspend; the card just shows what’s left.',
        icon: Wallet,
        accent: 'bg-sky-500',
        tint: 'text-sky-700 dark:text-sky-400',
    },
] as const;

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user ?? null;
    const appHome = user?.onboarded_at ? dashboard() : '/onboarding';

    return (
        <>
            <Head title="Balancer — your month, in one place" />

            <div className="min-h-svh bg-slate-200 text-slate-900 dark:bg-neutral-950 dark:text-neutral-50">
                <header className="sticky top-0 z-30 border-b border-slate-900/8 bg-slate-200/80 backdrop-blur-xl dark:border-white/8 dark:bg-neutral-950/80">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
                        <Link href="/" className="min-w-0 shrink">
                            <img src="/branding/logo_dark.svg" alt="Balancer" className="h-7 w-auto dark:hidden" />
                            <img src="/branding/logo_light.svg" alt="Balancer" className="hidden h-7 w-auto dark:block" />
                        </Link>
                        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                            <AppearanceToggleDropdown />
                            {user ? (
                                <Link href={appHome} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100">
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-900/6 dark:text-neutral-200 dark:hover:bg-white/8"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main>
                    <section className="relative overflow-hidden">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 bg-[url('/branding/background_bubbles.svg')] bg-cover bg-center opacity-50 dark:bg-[url('/branding/background_bubbles_dark.svg')] dark:opacity-40"
                        />

                        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
                            <div className="relative z-10 max-w-xl">
                                <p className="mb-5 text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-neutral-400">
                                    Written down. Not synced from a bank.
                                </p>
                                <h1 className="text-[2.7rem] leading-[1.05] font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-[4.25rem] dark:text-white">
                                    Your month,
                                    <span className="block italic">in one place.</span>
                                </h1>
                                <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-neutral-300">
                                    What came in, what went out, what’s left, and what you meant to spend.
                                </p>
                                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
                                    You write it down. We keep the month tidy.
                                </p>
                                {!user && (
                                    <div className="mt-8 flex flex-wrap items-center gap-3">
                                        <Link
                                            href={register()}
                                            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                        >
                                            Start this month
                                        </Link>
                                        <Link
                                            href={login()}
                                            className="rounded-full px-5 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
                                        >
                                            I already have an account
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                                <div className="absolute -top-4 -left-3 z-20 hidden w-44 rounded-2xl bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur sm:block dark:bg-neutral-900/90 dark:ring-1 dark:ring-white/10">
                                    <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Left to spend</p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">€412.00</p>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-700">
                                        <div className="h-full w-[58%] rounded-full bg-emerald-500" />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-400">Example · not your books</p>
                                </div>

                                <div className="rotate-2 overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.28)] dark:bg-neutral-800">
                                    <div className="flex items-center gap-1.5 px-4 py-3">
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                                        <span className="ml-3 text-[11px] text-white/40">Dashboard</span>
                                    </div>
                                    <img src={STILL} alt="" className="aspect-[16/11] w-full object-cover" />
                                </div>

                                <div className="absolute -right-2 -bottom-5 z-20 hidden w-40 rounded-2xl bg-slate-900 p-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] sm:block dark:bg-neutral-800">
                                    <p className="text-[10px] font-semibold tracking-widest text-white/50 uppercase">Available cash</p>
                                    <p className="mt-1 text-xl font-semibold tabular-nums">€1,840</p>
                                    <p className="mt-1 text-[11px] text-white/45">Leftover updates this</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border-y border-slate-900/8 dark:border-white/8">
                        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase sm:px-8 dark:text-neutral-500">
                            {['Purchases', 'Income', 'Recurring', 'Debts', 'Savings'].map((name) => (
                                <span key={name}>{name}</span>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-neutral-400">
                                Three beats
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                Record. See. Plan.
                            </h2>
                            <p className="mt-3 text-base text-slate-600 dark:text-neutral-300">
                                Same story as the first-run tour. Nothing extra.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {BEATS.map((beat) => {
                                const Icon = beat.icon;
                                return (
                                    <article
                                        key={beat.name}
                                        className="group relative overflow-hidden rounded-[1.6rem] bg-white p-7 shadow-[0_8px_40px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/8"
                                    >
                                        <span className={`absolute top-0 left-0 h-1 w-full ${beat.accent}`} />
                                        <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
                                            {beat.kicker} · {beat.name}
                                        </p>
                                        <div className={`mt-5 ${beat.tint}`}>
                                            <Icon className="h-7 w-7" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="mt-4 text-2xl font-semibold tracking-tight">{beat.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                            {beat.body}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="px-5 sm:px-8">
                        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-900 text-white dark:bg-neutral-900">
                            <div className="grid lg:grid-cols-2">
                                <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:py-16">
                                    <p className="text-[11px] font-semibold tracking-[0.22em] text-white/45 uppercase">
                                        Available cash
                                    </p>
                                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                                        We remember what you have
                                    </h2>
                                    <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                                        Two starting numbers: spendable cash on hand, and money already in savings. Each month’s leftover updates your available cash. A savings deposit moves cash into savings — we do not invent income for that.
                                    </p>
                                    <div className="mt-8 grid max-w-sm grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[11px] tracking-widest text-white/40 uppercase">Cash</p>
                                            <p className="mt-1 text-2xl font-semibold tabular-nums">On hand</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] tracking-widest text-white/40 uppercase">Savings</p>
                                            <p className="mt-1 text-2xl font-semibold tabular-nums">Set aside</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative min-h-64 lg:min-h-full">
                                    <img src={STILL} alt="" className="h-full w-full object-cover" />
                                    <div className="absolute right-6 bottom-6 flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm backdrop-blur">
                                        <PiggyBank className="h-4 w-4" />
                                        Not a fake paycheck
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
                        <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                            Keep this month tidy.
                        </h2>
                        <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 dark:text-neutral-300">
                            No bank connection. You type Facts. The dashboard shows what’s left.
                        </p>
                        {!user ? (
                            <Link
                                href={register()}
                                className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                            >
                                Sign up
                            </Link>
                        ) : (
                            <Link
                                href={appHome}
                                className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                            >
                                Go to Dashboard
                            </Link>
                        )}
                    </section>
                </main>

                <footer className="border-t border-slate-900/8 px-5 py-8 sm:px-8 dark:border-white/8">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        <img src="/branding/logo_dark.svg" alt="" className="h-5 w-auto opacity-50 dark:hidden" />
                        <img src="/branding/logo_light.svg" alt="" className="hidden h-5 w-auto opacity-50 dark:block" />
                        <p className="text-xs text-slate-400 dark:text-neutral-500">Your month, written down.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
