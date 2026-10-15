/**
 * User-facing copy for the public landing page and first-run / replay tour.
 * Edit strings here; layout stays in the page components.
 *
 * `shotsReady` shows the screenshots. Each frame has a light file and a dark file.
 */
export const shotsReady = true;

const pair = (light: string, dark: string) => ({ light, dark }) as const;

export const marketingCopy = {
    images: {
        dashboard: pair('/img/landing/dashboard-light.png', '/img/landing/dashboard-dark.png'),
        ledger: pair('/img/landing/ledger-light.png', '/img/landing/ledger-dark.png'),
        balanceSheet: pair('/img/landing/balance_sheet-light.png', '/img/landing/balance_sheet-dark.png'),
        budget: pair('/img/landing/budget-light.png', '/img/landing/budget-dark.png'),
        statistics: pair('/img/landing/statistics-light.png', '/img/landing/statistics-dark.png'),
        history: pair('/img/landing/past_balance_sheets-light.png', '/img/landing/past_balance_sheets-dark.png'),
        standing: pair('/img/landing/standing-light.png', '/img/landing/standing-dark.png'),
        onboarding: {
            dashboard: pair('/img/onboarding/dashboard-light.png', '/img/onboarding/dashboard-dark.png'),
            balanceSheet: pair('/img/onboarding/balance_sheet-light.png', '/img/onboarding/balance_sheet-dark.png'),
            ledger: pair('/img/onboarding/ledger-light.png', '/img/onboarding/ledger-dark.png'),
            standing: pair('/img/onboarding/standing-light.png', '/img/onboarding/standing-dark.png'),
            budget: pair('/img/onboarding/budget-light.png', '/img/onboarding/budget-dark.png'),
        },
    },

    landing: {
        headTitle: 'Balancer — your month, written down',
        header: {
            login: 'Log in',
            signup: 'Sign up',
            goToDashboard: 'Go to Dashboard',
        },
        hero: {
            eyebrow: 'Nothing is synced from a bank.',
            title: 'Your month,',
            titleEmphasis: 'written down.',
            lead: 'Coffee, rent, the money someone still owes you. You write it in. The month adds up from there.',
            cta: 'Start this month',
            ctaSecondary: 'I already have an account',
            shotLabel: 'Dashboard',
            shotSize: '2400 × 1500',
            shotAlt: 'The Balancer dashboard for a month',
        },
        intro: 'Five things end up in there: purchases, income, recurring bills, debts, and whatever you managed to save.',
        ledger: {
            label: 'The ledger',
            title: 'Where you write things down',
            body: 'This is the part you open when you get home. A purchase, a paycheck, rent that already knows which day it comes out. You should not have to type the rent again next month.',
            shotLabel: 'Ledger',
            shotSize: '2400 × 1600',
            shotAlt: 'Purchases in the ledger',
        },
        balance: {
            label: 'The balance sheet',
            title: 'What the month actually did',
            body: 'Money in, money out, and what was left. When you close the month, those numbers stay where you left them.',
            shotLabel: 'Balance sheet',
            shotSize: '1500 × 2000',
            shotAlt: 'This month’s balance sheet',
        },
        budget: {
            label: 'The budget',
            title: 'One number, if you want it',
            body: 'A monthly amount for ordinary spending. You can go past it. The card says so, and the rest of the app keeps working.',
            shotLabel: 'Budget',
            shotSize: '1500 × 2000',
            shotAlt: 'A monthly purchase budget',
        },
        cash: {
            eyebrow: 'Cash and savings',
            title: 'What you have, before the month starts',
            body: 'Two numbers. Cash you can spend, and money you’ve already put away. Leftover at the end of the month updates the cash. Moving money into savings is not a paycheck. I kept getting that wrong in other apps, so this one doesn’t.',
            shotLabel: 'Standing',
            shotSize: '1500 × 2000',
            shotAlt: 'Cash, savings, and upcoming bills',
        },
        others: {
            title: 'The rest of it',
            statistics: {
                name: 'Statistics',
                body: 'The same numbers, over more than one month.',
                shotLabel: 'Statistics',
                shotSize: '2400 × 1600',
                shotAlt: 'Spending over several months',
            },
            history: {
                name: 'Past months',
                body: 'Closed. They don’t get edited.',
                shotLabel: 'Past months',
                shotSize: '1500 × 2000',
                shotAlt: 'Closed monthly balance sheets',
            },
            standing: {
                name: 'Standing',
                body: 'Cash, savings, and the bills still coming.',
                shotLabel: 'Standing',
                shotSize: '1500 × 2000',
                shotAlt: 'Where things stand right now',
            },
        },
        close: {
            title: 'If you can write down a coffee, you can keep the month.',
            body: 'No bank login. You type what happened.',
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
        shotSize: '2000 × 1500',
        slides: [
            {
                title: 'This is the month',
                body: 'Balancer doesn’t connect to your bank. You write down what came in and what went out. The page is just those notes, added up.',
                image: pair('/img/onboarding/dashboard-light.png', '/img/onboarding/dashboard-dark.png'),
                imageAlt: 'The Balancer dashboard',
                shotLabel: 'Dashboard',
            },
            {
                title: 'A few cards, one page',
                body: 'The balance sheet is this month. The ledger is where you type. Statistics is the longer view. The budget is what you meant to spend. Standing is what’s in your pocket, and what’s still due.',
                image: pair('/img/onboarding/balance_sheet-light.png', '/img/onboarding/balance_sheet-dark.png'),
                imageAlt: 'The balance sheet',
                shotLabel: 'Balance sheet',
            },
            {
                title: 'You type it once',
                body: 'Purchases, income, debts, savings. Recurring things, like rent, can repeat on their own, so you aren’t entering them again next month.',
                image: pair('/img/onboarding/ledger-light.png', '/img/onboarding/ledger-dark.png'),
                imageAlt: 'The ledger',
                shotLabel: 'Ledger',
            },
            {
                title: 'Cash, and money set aside',
                body: 'You start with two numbers. What’s left at the end of a month updates the cash. A transfer into savings stays a transfer. It does not show up as income.',
                image: pair('/img/onboarding/standing-light.png', '/img/onboarding/standing-dark.png'),
                imageAlt: 'Cash and savings',
                shotLabel: 'Standing',
            },
            {
                title: 'A budget is optional',
                body: 'One amount for day-to-day purchases. Going over it is allowed. The card will tell you. You can split it by category later, once you have some.',
                image: pair('/img/onboarding/budget-light.png', '/img/onboarding/budget-dark.png'),
                imageAlt: 'The purchase budget',
                shotLabel: 'Budget',
            },
        ],
        forms: {
            kicker: 'Before the month starts',
            title: 'What do you have right now?',
            body: 'Zero is fine. Leaving it blank isn’t. These aren’t income. They’re just where the wallet starts.',
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

export type OnboardingSlide = (typeof marketingCopy.onboarding.slides)[number];
