import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { marketingCopy } from '@/config/marketing-copy';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { PiggyBank } from 'lucide-react';

const copy = marketingCopy.landing;
const shots = marketingCopy.images;

const BEAT_ACCENT: Record<(typeof copy.beats.items)[number]['name'], string> = {
    Ledger: 'bg-emerald-500',
    'Balance Sheet': 'bg-yellow-500',
    Budget: 'bg-sky-500',
};

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user ?? null;
    const appHome = user?.onboarded_at ? dashboard() : '/onboarding';

    return (
        <>
            <Head title={copy.headTitle} />

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
                                    {copy.header.goToDashboard}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-900/6 dark:text-neutral-200 dark:hover:bg-white/8"
                                    >
                                        {copy.header.login}
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                    >
                                        {copy.header.signup}
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
                                    {copy.hero.kicker}
                                </p>
                                <h1 className="text-[2.7rem] leading-[1.05] font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-[4.25rem] dark:text-white">
                                    {copy.hero.title}
                                    <span className="block italic">{copy.hero.titleEmphasis}</span>
                                </h1>
                                <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-neutral-300">
                                    {copy.hero.lead}
                                </p>
                                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
                                    {copy.hero.sub}
                                </p>
                                {!user && (
                                    <div className="mt-8 flex flex-wrap items-center gap-3">
                                        <Link
                                            href={register()}
                                            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                        >
                                            {copy.hero.cta}
                                        </Link>
                                        <Link
                                            href={login()}
                                            className="rounded-full px-5 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
                                        >
                                            {copy.hero.ctaSecondary}
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                                <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/8 dark:bg-neutral-900 dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)] dark:ring-white/10">
                                    <img
                                        src={shots.dashboard}
                                        alt={copy.mock.dashboardAlt}
                                        className="w-full"
                                    />
                                </div>
                                <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-neutral-500">
                                    {copy.mock.exampleCaption}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="border-y border-slate-900/8 dark:border-white/8">
                        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase sm:px-8 dark:text-neutral-500">
                            {marketingCopy.domains.map((name) => (
                                <span key={name}>{name}</span>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-neutral-400">
                                {copy.beats.kicker}
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {copy.beats.title}
                            </h2>
                            <p className="mt-3 text-base text-slate-600 dark:text-neutral-300">
                                {copy.beats.sub}
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {copy.beats.items.map((beat) => (
                                <article
                                    key={beat.name}
                                    className="group relative overflow-hidden rounded-[1.6rem] bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/8"
                                >
                                    <span className={`absolute top-0 left-0 z-10 h-1 w-full ${BEAT_ACCENT[beat.name]}`} />
                                    <div className="bg-slate-50 px-4 pt-6 dark:bg-neutral-950/40">
                                        <img
                                            src={beat.image}
                                            alt={beat.imageAlt}
                                            className="mx-auto max-h-56 w-full object-contain object-top"
                                        />
                                    </div>
                                    <div className="p-7 pt-6">
                                        <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
                                            {beat.kicker} · {beat.name}
                                        </p>
                                        <h3 className="mt-4 text-2xl font-semibold tracking-tight">{beat.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                            {beat.body}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="px-5 sm:px-8">
                        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-900 text-white dark:bg-neutral-900">
                            <div className="grid lg:grid-cols-2">
                                <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:py-16">
                                    <p className="text-[11px] font-semibold tracking-[0.22em] text-white/45 uppercase">
                                        {copy.cash.kicker}
                                    </p>
                                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                                        {copy.cash.title}
                                    </h2>
                                    <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                                        {copy.cash.body}
                                    </p>
                                    <div className="mt-8 grid max-w-sm grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[11px] tracking-widest text-white/40 uppercase">{copy.cash.cashLabel}</p>
                                            <p className="mt-1 text-2xl font-semibold tabular-nums">{copy.cash.cashValue}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] tracking-widest text-white/40 uppercase">{copy.cash.savingsLabel}</p>
                                            <p className="mt-1 text-2xl font-semibold tabular-nums">{copy.cash.savingsValue}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative flex min-h-64 items-center justify-center bg-neutral-800 p-6 lg:min-h-full lg:p-10">
                                    <img
                                        src={shots.standing}
                                        alt={copy.cash.imageAlt}
                                        className="max-h-[28rem] w-full rounded-2xl bg-white object-contain shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
                                    />
                                    <div className="absolute right-6 bottom-6 flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm backdrop-blur">
                                        <PiggyBank className="h-4 w-4" />
                                        {copy.cash.badge}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-neutral-400">
                                {copy.modules.kicker}
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                                {copy.modules.title}
                            </h2>
                        </div>
                        <div className="mt-10 grid gap-6 md:grid-cols-3">
                            {copy.modules.items.map((mod) => (
                                <figure
                                    key={mod.name}
                                    className="overflow-hidden rounded-[1.6rem] bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/8"
                                >
                                    <div className="bg-slate-50 px-4 pt-6 dark:bg-neutral-950/40">
                                        <img
                                            src={mod.image}
                                            alt={mod.imageAlt}
                                            className="mx-auto max-h-56 w-full object-contain object-top"
                                        />
                                    </div>
                                    <figcaption className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-neutral-200">
                                        {mod.name}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
                        <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                            {copy.close.title}
                        </h2>
                        <p className="mx-auto mt-4 max-w-lg text-base text-slate-600 dark:text-neutral-300">
                            {copy.close.body}
                        </p>
                        {!user ? (
                            <Link
                                href={register()}
                                className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                            >
                                {copy.close.signup}
                            </Link>
                        ) : (
                            <Link
                                href={appHome}
                                className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                            >
                                {copy.close.goToDashboard}
                            </Link>
                        )}
                    </section>
                </main>

                <footer className="border-t border-slate-900/8 px-5 py-8 sm:px-8 dark:border-white/8">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        <img src="/branding/logo_dark.svg" alt="" className="h-5 w-auto opacity-50 dark:hidden" />
                        <img src="/branding/logo_light.svg" alt="" className="hidden h-5 w-auto opacity-50 dark:block" />
                        <p className="text-xs text-slate-400 dark:text-neutral-500">{copy.footer.tagline}</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
