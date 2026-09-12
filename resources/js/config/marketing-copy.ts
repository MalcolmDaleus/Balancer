/**
 * User-facing copy for the public landing page and first-run / replay tour.
 * Edit strings here; layout, icons, and colors stay in the page components.
 */
export const marketingCopy = {
    still: '/img/landing/elementor-placeholder-image.png',

    domains: ['Purchases', 'Income', 'Recurring', 'Debts', 'Savings'] as const,

    landing: {
        headTitle: 'Balancer — your month, in one place',
        header: {
            login: 'Log in',
            signup: 'Sign up',
            goToDashboard: 'Go to Dashboard',
        },
        hero: {
            kicker: 'Written down. Not synced from a bank.',
            title: 'Your month,',
            titleEmphasis: 'in one place.',
            lead: 'What came in, what went out, what’s left, and what you meant to spend.',
            sub: 'You write it down. We keep the month tidy.',
            cta: 'Start this month',
            ctaSecondary: 'I already have an account',
        },
        mock: {
            leftToSpend: 'Left to spend',
            leftAmount: '€412.00',
            exampleCaption: 'Example · not your books',
            dashboardChrome: 'Dashboard',
            availableCash: 'Available cash',
            cashAmount: '€1,840',
            leftoverCaption: 'Leftover updates this',
        },
        beats: {
            kicker: 'Three beats',
            title: 'Record. See. Plan.',
            sub: 'Same story as the first-run tour. Nothing extra.',
            items: [
                {
                    kicker: '01',
                    name: 'Ledger',
                    title: 'Record it',
                    body: 'Purchases, income, recurring, debts, and savings are Facts you type. Recurring streams and pay schedules generate the repeats so you are not retyping rent every month.',
                },
                {
                    kicker: '02',
                    name: 'Balance Sheet',
                    title: 'See the month',
                    body: 'Balance Sheet is what moved this month. Statistics is what’s typical. Past months stay locked once you close them.',
                },
                {
                    kicker: '03',
                    name: 'Budget',
                    title: 'Plan what’s left',
                    body: 'Set one monthly amount for day-to-day purchases if you want. You can always overspend; the card just shows what’s left.',
                },
            ],
        },
        cash: {
            kicker: 'Available cash',
            title: 'We remember what you have',
            body: 'Two starting numbers: spendable cash on hand, and money already in savings. Each month’s leftover updates your available cash. A savings deposit moves cash into savings — we do not invent income for that.',
            cashLabel: 'Cash',
            cashValue: 'On hand',
            savingsLabel: 'Savings',
            savingsValue: 'Set aside',
            badge: 'Not a fake paycheck',
        },
        close: {
            title: 'Keep this month tidy.',
            body: 'No bank connection. You type Facts. The dashboard shows what’s left.',
            signup: 'Sign up',
            goToDashboard: 'Go to Dashboard',
        },
        footer: {
            tagline: 'Your month, written down.',
        },
    },

    onboarding: {
        headTitle: {
            firstRun: 'Get started',
            replay: 'Tour',
        },
        logOut: 'Log out',
        replayKicker: 'Tour',
        stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
        nav: {
            back: 'Back',
            skip: 'Skip',
            close: 'Close',
            next: 'Next',
            continue: 'Continue',
            done: 'Done',
            backToSlides: 'Back to slides',
            goToDashboard: 'Go to dashboard',
        },
        slides: [
            {
                title: 'Your month, in one place',
                body: 'Balancer is not a bank connection. You write down what came in and what went out. We keep the month tidy so you can see what’s left.',
            },
            {
                title: 'Five cards, one dashboard',
                body: 'Balance Sheet is what moved this month. Ledger is where you type. Statistics is what’s typical. Budget is what you meant to spend. Past months stay locked once you close them.',
            },
            {
                title: 'You type Facts. Schedules do the rest.',
                body: 'Purchases, income, recurring, debts, and savings are Facts you enter. Recurring streams and pay schedules generate the repeats so you are not retyping rent every month.',
            },
            {
                title: 'Available cash and savings',
                body: 'Two starting numbers: spendable cash on hand, and money already in savings. We remember them. Each month’s leftover updates your available cash. A savings deposit moves cash into savings — we do not create a fake income for these.',
            },
            {
                title: 'A simple purchase budget',
                body: 'Optional: set one monthly amount for day-to-day purchases. You can always overspend; the card just shows what’s left. Category limits come later, once you have categories.',
            },
        ],
        forms: {
            kicker: 'Starting numbers',
            title: 'What do you have right now?',
            body: 'Zero is fine. Blank is not. These are not income — they are the wallet we start from.',
            cashLabel: 'Available cash',
            savingsLabel: 'Savings',
            budgetLabel: 'Monthly purchase budget (optional)',
            amountPlaceholder: '0.00',
            budgetPlaceholder: 'Skip for now',
            requiredAmount: 'Enter an amount. Zero is fine.',
            invalidAmount: 'Enter a valid amount, or leave this blank.',
            resetConfirm: 'Wipe all financial data and return to onboarding?',
            resetLocal: 'Local: reset to onboarding',
        },
    },
} as const;

export type MarketingBeat = (typeof marketingCopy.landing.beats.items)[number];
export type OnboardingSlide = (typeof marketingCopy.onboarding.slides)[number];
