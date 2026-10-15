import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import PublicFooter from '@/components/public-footer';
import ShotFrame from '@/components/shot-frame';
import { marketingCopy, shotsReady } from '@/config/marketing-copy';
import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

const copy = marketingCopy.landing;
const shots = marketingCopy.images;

const frame = 'shadow-[0_24px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/8 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:ring-white/10';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user ?? null;
    const appHome = user?.onboarded_at ? dashboard() : '/onboarding';

    const shot = (pair: { readonly light: string; readonly dark: string }) =>
        shotsReady ? pair : undefined;

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
                                <Link
                                    href={appHome}
                                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                >
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
                            className="pointer-events-none absolute inset-0 bg-[url('/branding/background_bubbles.svg')] bg-cover bg-top opacity-70 dark:bg-[url('/branding/background_bubbles_dark.svg')] dark:opacity-50"
                        />
                        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12 lg:pt-20 lg:pb-28">
                            <div className="max-w-xl">
                                <p className="text-sm text-slate-600 dark:text-neutral-300">{copy.hero.eyebrow}</p>
                                <h1 className="mt-4 text-[2.7rem] leading-[1.02] font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-[4.4rem] dark:text-white">
                                    {copy.hero.title}
                                    <span className="block font-medium italic">{copy.hero.titleEmphasis}</span>
                                </h1>
                                <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-neutral-300">{copy.hero.lead}</p>
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
                            <ShotFrame
                                src={shot(shots.dashboard)?.light}
                                srcDark={shot(shots.dashboard)?.dark}
                                alt={copy.hero.shotAlt}
                                label={copy.hero.shotLabel}
                                size={copy.hero.shotSize}
                                accent="bg-slate-500"
                                className={`aspect-[16/10] rounded-[1.75rem] ${frame}`}
                            />
                        </div>
                    </section>

                    <div className="relative z-10 mx-auto max-w-6xl px-3 pb-8 sm:px-6">
                        <div className="-mt-8 rounded-[2rem] bg-white px-5 py-14 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-10 lg:px-14 lg:py-20 dark:bg-neutral-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                            <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-neutral-300">{copy.intro}</p>

                            <article className="mt-14 grid items-center gap-8 lg:mt-20 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
                                <ShotFrame
                                    src={shot(shots.ledger)?.light}
                                    srcDark={shot(shots.ledger)?.dark}
                                    alt={copy.ledger.shotAlt}
                                    label={copy.ledger.shotLabel}
                                    size={copy.ledger.shotSize}
                                    accent="bg-emerald-500"
                                    className={`aspect-[3/2] rounded-[1.5rem] ${frame}`}
                                />
                                <div>
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{copy.ledger.label}</p>
                                    <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.ledger.title}</h2>
                                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-neutral-300">{copy.ledger.body}</p>
                                </div>
                            </article>

                            <div className="mt-16 grid items-start gap-12 md:grid-cols-2 lg:mt-24 lg:gap-16">
                                <article>
                                    <ShotFrame
                                        src={shot(shots.balanceSheet)?.light}
                                        srcDark={shot(shots.balanceSheet)?.dark}
                                        alt={copy.balance.shotAlt}
                                        label={copy.balance.shotLabel}
                                        size={copy.balance.shotSize}
                                        accent="bg-amber-400"
                                        className={`aspect-[3/4] rounded-[1.5rem] ${frame}`}
                                    />
                                    <p className="mt-5 text-sm font-medium text-amber-700 dark:text-amber-300">{copy.balance.label}</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{copy.balance.title}</h2>
                                    <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-neutral-300">{copy.balance.body}</p>
                                </article>
                                <article className="md:mt-16">
                                    <ShotFrame
                                        src={shot(shots.budget)?.light}
                                        srcDark={shot(shots.budget)?.dark}
                                        alt={copy.budget.shotAlt}
                                        label={copy.budget.shotLabel}
                                        size={copy.budget.shotSize}
                                        accent="bg-sky-500"
                                        className={`aspect-[3/4] rounded-[1.5rem] ${frame}`}
                                    />
                                    <p className="mt-5 text-sm font-medium text-sky-700 dark:text-sky-300">{copy.budget.label}</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{copy.budget.title}</h2>
                                    <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-neutral-300">{copy.budget.body}</p>
                                </article>
                            </div>

                            <section className="mt-16 overflow-hidden rounded-[1.75rem] bg-slate-900 text-white lg:mt-24 dark:bg-neutral-950 dark:ring-1 dark:ring-white/10">
                                <div className="grid items-center lg:grid-cols-[1.15fr_0.85fr]">
                                    <div className="px-7 py-10 sm:px-10 lg:px-12 lg:py-14">
                                        <p className="text-sm text-white/55">{copy.cash.eyebrow}</p>
                                        <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">{copy.cash.title}</h2>
                                        <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">{copy.cash.body}</p>
                                    </div>
                                    <div className="px-7 pb-10 sm:px-10 lg:px-12 lg:py-12">
                                        <ShotFrame
                                            src={shot(shots.standing)?.light}
                                            srcDark={shot(shots.standing)?.dark}
                                            alt={copy.cash.shotAlt}
                                            label={copy.cash.shotLabel}
                                            size={copy.cash.shotSize}
                                            accent="bg-emerald-400"
                                            className="mx-auto aspect-[3/4] w-full max-w-xs rounded-[1.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="mt-16 lg:mt-24">
                                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{copy.others.title}</h2>
                                <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:gap-10">
                                    <figure>
                                        <ShotFrame
                                            src={shot(shots.statistics)?.light}
                                            srcDark={shot(shots.statistics)?.dark}
                                            alt={copy.others.statistics.shotAlt}
                                            label={copy.others.statistics.shotLabel}
                                            size={copy.others.statistics.shotSize}
                                            accent="bg-violet-400"
                                            className={`aspect-[3/2] rounded-[1.5rem] ${frame}`}
                                        />
                                        <figcaption className="mt-4">
                                            <p className="text-lg font-semibold">{copy.others.statistics.name}</p>
                                            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                                {copy.others.statistics.body}
                                            </p>
                                        </figcaption>
                                    </figure>
                                    <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
                                        <figure>
                                            <ShotFrame
                                                src={shot(shots.history)?.light}
                                                srcDark={shot(shots.history)?.dark}
                                                alt={copy.others.history.shotAlt}
                                                label={copy.others.history.shotLabel}
                                                size={copy.others.history.shotSize}
                                                accent="bg-amber-400"
                                                className={`aspect-[3/4] rounded-2xl ${frame}`}
                                            />
                                            <figcaption className="mt-3">
                                                <p className="text-sm font-semibold">{copy.others.history.name}</p>
                                                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                                    {copy.others.history.body}
                                                </p>
                                            </figcaption>
                                        </figure>
                                        <figure>
                                            <ShotFrame
                                                src={shot(shots.standing)?.light}
                                                srcDark={shot(shots.standing)?.dark}
                                                alt={copy.others.standing.shotAlt}
                                                label={copy.others.standing.shotLabel}
                                                size={copy.others.standing.shotSize}
                                                accent="bg-emerald-500"
                                                className={`aspect-[3/4] rounded-2xl ${frame}`}
                                            />
                                            <figcaption className="mt-3">
                                                <p className="text-sm font-semibold">{copy.others.standing.name}</p>
                                                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                                    {copy.others.standing.body}
                                                </p>
                                            </figcaption>
                                        </figure>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-20 border-t border-slate-200 pt-12 lg:mt-24 dark:border-neutral-800">
                                <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">{copy.close.title}</h2>
                                <p className="mt-4 max-w-md text-base text-slate-600 dark:text-neutral-300">{copy.close.body}</p>
                                <Link
                                    href={user ? appHome : register()}
                                    className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                                >
                                    {user ? copy.close.goToDashboard : copy.close.signup}
                                </Link>
                            </section>
                        </div>
                    </div>
                </main>

                <PublicFooter tagline={copy.footer.tagline} />
            </div>
        </>
    );
}
