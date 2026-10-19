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
        headTitle: 'Balancer — Keep track of your spending',
        header: {
            login: 'Log in',
            signup: 'Sign up',
            goToDashboard: 'Go to Dashboard',
        },
        hero: {
            eyebrow: 'Personal finance',
            title: 'Keep track of',
            titleEmphasis: 'your spending',
            lead: 'Watching your spending and keeping track of monthly expenses is a chore all by itself. Trying to navigate complicated budgeting apps is even worse. Balancer becomes the glue holding your financial life together. Record the repeating amounts once, add your daily expenses in a few taps, and Balancer does the hard math for you, then lets you see everything in a clean UI.',
            cta: 'Sign up',
            ctaSecondary: 'Log in',
            shotLabel: 'Balancer',
            shotSize: '2400 × 1500',
            shotAlt: 'Balancer',
        },
        intro: 'The root of the app is based in taking in numbers from 5 main budgeting domains: Income, Debt, Spending, Recurring Spending, and Savings Contributions. The app uses a monthly cycle, taking in data provided by the user and displaying it in a balance sheet to see clearly how things add up. The data from these domains is used for several types of calculations that provide the user with real time analysis of their spending habits, and generates a historical report to see their progress over time, with the end goal of saving money.',
        ledger: {
            label: 'Ledger',
            title: 'A simple ledger',
            body: "After each purchase, all you do is write what it was, how much it cost, and how you'd categorize it. Your morning coffee, this week's groceries, and that new t-shirt get filed away and wrapped into this month's story. The idea is for the actual data input to be so simple that it becomes a seamless part of the user's daily life, while providing real value to them through pure analysis. When a user taps their card for a coffee, writing it down is as simple as opening up the app, typing in \"Coffee\" and \"$3.45\" and allowing the app to incorporate it into the final analysis.",
            shotLabel: 'Ledger',
            shotSize: '2400 × 1600',
            shotAlt: 'Ledger',
        },
        balance: {
            label: 'Balance Sheet',
            title: 'Five domains, one rollover',
            body: 'Income, debt, purchases, recurring charges, and savings add up to a single number for the month. That number is the whole point of opening the app.',
            shotLabel: 'Balance sheet',
            shotSize: '1500 × 2000',
            shotAlt: 'Balance sheet',
        },
        budget: {
            label: 'Budget',
            title: 'Non-opinionated budgeting',
            body: "Balancer doesn't judge you for how much you spend or why. It lets you see for yourself and make decisions based on what YOU want to do.",
            shotLabel: 'Budget',
            shotSize: '1500 × 2000',
            shotAlt: 'Budget',
        },
        cash: {
            eyebrow: 'Savings',
            title: 'The most simple domain which simply records manual cashflow into savings.',
            body: 'It\'s meant to be an intentional action the user takes when a certain amount of money is set aside any month or widthdrawn from savings.',
            shotLabel: 'Standing',
            shotSize: '1500 × 2000',
            shotAlt: 'Standing',
        },
        others: {
            title: 'The different pieces',
            statistics: {
                name: 'Statistics',
                body: 'This module gives more life to the numbers and records. Data from all five domains is compiled and used to create monthly and historical graphs and charts for a more visual way of viewing the financial records. The module includes line charts for historical trends month to month, bar charts for type and categorical comparisons, pie charts to see how different portions of a financial domain contribute to the whole picture, and big picture markers for contextual analysis.',
                shotLabel: 'Statistics',
                shotSize: '2400 × 1600',
                shotAlt: 'Statistics',
            },
            history: {
                name: 'Past Balance Sheets',
                body: 'Users can see basic breakdowns of the five domains in past months in this module. It acts as a historial module for monthly cashflow.',
                shotLabel: 'Past months',
                shotSize: '1500 × 2000',
                shotAlt: 'Past months',
            },
            standing: {
                name: 'Standing',
                body: '',
                shotLabel: 'Standing',
                shotSize: '1500 × 2000',
                shotAlt: 'Standing',
            },
        },
        close: {
            title: "Keeping track of your finances doesn't have to involve spreadsheets or wondering where all the money went.",
            body: 'Balancer works on a monthly cycle, locking in the final totals. Each month builds your long-running statistics and history. Within the same month you see your real-time changes, and over time you see the general habits.',
            signup: 'Sign up',
            goToDashboard: 'Go to Dashboard',
        },
        footer: {
            tagline: 'Keep track of your spending',
        },
    },

    onboarding: {
        headTitle: {
            firstRun: 'Keep track of your spending',
            replay: 'What is Balancer?',
        },
        logOut: 'Log out',
        replayKicker: 'What is Balancer?',
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
                title: 'Keep track of your spending',
                body: 'Watching your spending and keeping track of monthly expenses is a chore all by itself. Trying to navigate complicated budgeting apps is even worse. Balancer becomes the glue holding your financial life together. Record the repeating amounts once, add your daily expenses in a few taps, and Balancer does the hard math for you, then lets you see everything in a clean UI.',
                image: pair('/img/onboarding/dashboard-light.png', '/img/onboarding/dashboard-dark.png'),
                imageAlt: 'Balancer',
                shotLabel: 'Balancer',
            },
            {
                title: 'Five domains, one rollover',
                body: 'Income, debt, purchases, recurring charges, and savings add up to a single number for the month. That number is the whole point of opening the app. This is where you see the simple analysis of how the numbers are adding up each month.',
                image: pair('/img/onboarding/balance_sheet-light.png', '/img/onboarding/balance_sheet-dark.png'),
                imageAlt: 'Balance sheet',
                shotLabel: 'Balance sheet',
            },
            {
                title: 'A simple ledger',
                body: "After each purchase, all you do is write what it was, how much it cost, and how you'd categorize it. Your morning coffee, this week's groceries, and that new t-shirt get filed away and wrapped into this month's story.",
                image: pair('/img/onboarding/ledger-light.png', '/img/onboarding/ledger-dark.png'),
                imageAlt: 'Ledger',
                shotLabel: 'Ledger',
            },
            {
                title: 'Savings',
                body: "The most simple domain which simply records manual cashflow into savings. It's meant to be an intentional action the user takes when a certain amount of money is set aside any month or widthdrawn from savings.",
                image: pair('/img/onboarding/standing-light.png', '/img/onboarding/standing-dark.png'),
                imageAlt: 'Standing',
                shotLabel: 'Standing',
            },
            {
                title: 'Non-opinionated budgeting',
                body: "Balancer doesn't judge you for how much you spend or why. It lets you see for yourself and make decisions based on what YOU want to do.",
                image: pair('/img/onboarding/budget-light.png', '/img/onboarding/budget-dark.png'),
                imageAlt: 'Budget',
                shotLabel: 'Budget',
            },
        ],
        forms: {
            kicker: 'Savings',
            title: 'The most simple domain which simply records manual cashflow into savings.',
            body: "It's meant to be an intentional action the user takes when a certain amount of money is set aside any month or widthdrawn from savings.",
            cashLabel: 'Available cash',
            savingsLabel: 'Savings',
            budgetLabel: 'Global monthly spending limit',
            amountPlaceholder: '0.00',
            budgetPlaceholder: '0.00',
            requiredAmount: 'Enter an amount. Zero is fine.',
            invalidAmount: 'Enter a valid amount, or leave this blank.',
            resetConfirm: 'Wipe all financial data and return to onboarding?',
            resetLocal: 'Local: reset to onboarding',
        },
    },
} as const;

export type OnboardingSlide = (typeof marketingCopy.onboarding.slides)[number];
