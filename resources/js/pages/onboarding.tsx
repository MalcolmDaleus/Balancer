import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { marketingCopy } from '@/config/marketing-copy';
import { currencySymbol, majorInputToCents } from '@/lib/money';
import { type SharedData } from '@/types';
import { dashboard, logout } from '@/routes';
import { Head, router, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

const copy = marketingCopy.onboarding;
const SLIDES = copy.slides;

export default function Onboarding({
    replay,
    currency,
    locale,
}: {
    replay: boolean;
    currency: string;
    locale?: string | null;
}) {
    const [step, setStep] = useState(0);
    const [showForms, setShowForms] = useState(false);
    const [cash, setCash] = useState('');
    const [savings, setSavings] = useState('');
    const [budget, setBudget] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    const { isLocal } = usePage<SharedData>().props;
    const symbol = useMemo(() => currencySymbol(currency, locale), [currency, locale]);
    const slide = SLIDES[step];
    const lastSlide = step === SLIDES.length - 1;

    const goDashboard = () => router.visit(dashboard());

    const skipSlides = () => {
        if (replay) {
            goDashboard();
            return;
        }
        setShowForms(true);
    };

    const nextSlide = () => {
        if (lastSlide) {
            skipSlides();
            return;
        }
        setStep((s) => s + 1);
    };

    const submit = () => {
        const liquidity = majorInputToCents(cash, locale);
        const savingsCents = majorInputToCents(savings, locale);
        const nextErrors: Record<string, string> = {};

        if (cash.trim() === '' || liquidity === null || Number.isNaN(liquidity)) {
            nextErrors.liquidity_cents = copy.forms.requiredAmount;
        }
        if (savings.trim() === '' || savingsCents === null || Number.isNaN(savingsCents)) {
            nextErrors.savings_cents = copy.forms.requiredAmount;
        }

        let discretionary: number | null = null;
        if (budget.trim() !== '') {
            discretionary = majorInputToCents(budget, locale);
            if (discretionary === null || Number.isNaN(discretionary)) {
                nextErrors.discretionary_cents = copy.forms.invalidAmount;
            }
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0 || liquidity === null || savingsCents === null) {
            return;
        }

        setBusy(true);
        router.post(
            '/onboarding',
            {
                liquidity_cents: liquidity,
                savings_cents: savingsCents,
                ...(discretionary && discretionary > 0 ? { discretionary_cents: discretionary } : {}),
            },
            {
                onError: (bag) => {
                    setErrors({
                        liquidity_cents: bag.liquidity_cents,
                        savings_cents: bag.savings_cents,
                        discretionary_cents: bag.discretionary_cents,
                    });
                    setBusy(false);
                },
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <>
            <Head title={replay ? copy.headTitle.replay : copy.headTitle.firstRun} />
            <main className="bg-[url('/branding/background_bubbles.svg')] dark:bg-[url('/branding/background_bubbles_dark.svg')] flex min-h-svh flex-col items-center justify-center bg-slate-200 bg-cover bg-center bg-no-repeat px-4 py-10 md:px-8 md:py-12 dark:bg-neutral-950">
                <AppearanceToggleDropdown className="fixed top-4 left-4 z-20" />
                <button
                    type="button"
                    onClick={() => router.post(logout().url)}
                    className="fixed top-4 right-4 z-20 text-sm text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                    {copy.logOut}
                </button>

                <div className={`w-full ${showForms ? 'max-w-lg' : 'max-w-lg md:max-w-6xl'}`}>
                    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:bg-neutral-900 dark:shadow-[0_8px_48px_rgba(0,0,0,0.55)] dark:ring-1 dark:ring-neutral-800/60">
                        {!showForms ? (
                            <div className="flex flex-col md:grid md:min-h-[min(34rem,calc(100dvh-8rem))] md:grid-cols-[3fr_2fr] lg:min-h-[min(42rem,calc(100dvh-6rem))]">
                                <div className="flex flex-col justify-between gap-6 px-8 py-8 sm:px-10 md:px-12 md:py-12 lg:px-16">
                                    <div className="space-y-3 md:space-y-4">
                                        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">
                                            {replay ? copy.replayKicker : copy.stepOf(step + 1, SLIDES.length)}
                                        </p>
                                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl dark:text-neutral-50">
                                            {slide.title}
                                        </h1>
                                        <p className="text-sm leading-relaxed text-slate-600 md:text-base md:leading-7 dark:text-neutral-300">
                                            {slide.body}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center justify-center gap-1.5 md:justify-start">
                                            {SLIDES.map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    aria-label={`Go to slide ${i + 1}`}
                                                    onClick={() => setStep(i)}
                                                    className={`h-1.5 rounded-full transition-all ${
                                                        i === step
                                                            ? 'w-6 bg-slate-800 dark:bg-neutral-100'
                                                            : 'w-1.5 bg-slate-200 dark:bg-neutral-700'
                                                    }`}
                                                />
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep((s) => Math.max(0, s - 1))}
                                                disabled={step === 0}
                                                className="text-sm text-slate-500 disabled:opacity-30 dark:text-neutral-400"
                                            >
                                                {copy.nav.back}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="sm" onClick={skipSlides}>
                                                    {replay ? copy.nav.close : copy.nav.skip}
                                                </Button>
                                                <Button type="button" size="sm" onClick={nextSlide}>
                                                    {lastSlide ? (replay ? copy.nav.done : copy.nav.continue) : copy.nav.next}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="order-first p-4 pb-0 md:order-none md:h-full md:p-6 md:pl-3">
                                    <div className="h-40 overflow-hidden rounded-2xl bg-slate-100 md:h-full dark:bg-neutral-800">
                                        <img
                                            src={marketingCopy.still}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 px-8 py-8 sm:px-10">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-neutral-500">
                                        {copy.forms.kicker}
                                    </p>
                                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-neutral-50">
                                        {copy.forms.title}
                                    </h1>
                                    <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                        {copy.forms.body}
                                    </p>
                                </div>

                                <div className="grid gap-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="liquidity">{copy.forms.cashLabel}</Label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                                                {symbol}
                                            </span>
                                            <Input
                                                id="liquidity"
                                                inputMode="decimal"
                                                className="pl-8"
                                                placeholder={copy.forms.amountPlaceholder}
                                                value={cash}
                                                onChange={(e) => setCash(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <InputError message={errors.liquidity_cents} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="savings">{copy.forms.savingsLabel}</Label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                                                {symbol}
                                            </span>
                                            <Input
                                                id="savings"
                                                inputMode="decimal"
                                                className="pl-8"
                                                placeholder={copy.forms.amountPlaceholder}
                                                value={savings}
                                                onChange={(e) => setSavings(e.target.value)}
                                            />
                                        </div>
                                        <InputError message={errors.savings_cents} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="budget">{copy.forms.budgetLabel}</Label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                                                {symbol}
                                            </span>
                                            <Input
                                                id="budget"
                                                inputMode="decimal"
                                                className="pl-8"
                                                placeholder={copy.forms.budgetPlaceholder}
                                                value={budget}
                                                onChange={(e) => setBudget(e.target.value)}
                                            />
                                        </div>
                                        <InputError message={errors.discretionary_cents} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForms(false)}
                                        className="text-sm text-slate-500 dark:text-neutral-400"
                                    >
                                        {copy.nav.backToSlides}
                                    </button>
                                    <Button type="button" onClick={submit} disabled={busy}>
                                        {busy && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        {copy.nav.goToDashboard}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    {isLocal && replay && (
                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                className="text-xs text-slate-500 underline-offset-4 hover:underline dark:text-neutral-400"
                                onClick={() => {
                                    if (window.confirm(copy.forms.resetConfirm)) {
                                        router.post('/dev/reset-onboarding');
                                    }
                                }}
                            >
                                {copy.forms.resetLocal}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
