/**
 * Privacy policy and terms of use. Plain-language drafts — have them reviewed
 * before relying on them, and bump `updated` whenever the text changes.
 */
const operator = 'Malcolm Daleus (Malcolm JD Studio)';
const contactEmail = 'mdaleus21@gmail.com';

export type LegalSection = {
    heading: string;
    paragraphs?: readonly string[];
    bullets?: readonly string[];
    after?: readonly string[];
};
export type LegalDocument = { headTitle: string; title: string; intro: string; sections: readonly LegalSection[] };

export const legalCopy = {
    updated: '8 October 2026',
    updatedLabel: 'Last updated',
    contactEmail,
    links: {
        privacy: 'Privacy',
        terms: 'Terms',
        home: 'Home',
    },
    signupNotice: {
        before: 'By creating an account you agree to the',
        terms: 'Terms of use',
        and: 'and',
        privacy: 'Privacy policy',
        after: '.',
    },

    privacy: {
        headTitle: 'Privacy policy',
        title: 'Privacy policy',
        intro: 'Balancer is a personal bookkeeping tool. You type in your own figures; Balancer never connects to your bank. This page explains what we store, why, and what you can do about it.',
        sections: [
            {
                heading: 'Who is responsible',
                paragraphs: [
                    `Balancer is run by ${operator}, who is the controller of your personal data under the GDPR. Questions or requests: ${contactEmail}.`,
                ],
            },
            {
                heading: 'What we store',
                bullets: [
                    'Account details: first and last name, email address, password (stored only as a one-way hash), currency and display language.',
                    'Your finance records: purchases, income, recurring payments, debts, savings, budgets, categories and closed monthly balance sheets — exactly what you enter.',
                    'Bug reports you send: the text you write, which part of the app it concerns, and whether you were on desktop or mobile.',
                    'Technical data: while you are signed in, a session record with your IP address and browser identifier. Server error logs may also contain your IP address and the page you requested.',
                ],
            },
            {
                heading: 'Why we use it',
                bullets: [
                    'To run your account and show your figures back to you (performing our agreement with you, GDPR art. 6(1)(b)).',
                    'To keep the service secure, prevent abuse and fix bugs (our legitimate interest, art. 6(1)(f)).',
                ],
                after: ['We do not sell your data, show ads, send marketing, or use analytics or tracking tools.'],
            },
            {
                heading: 'Cookies',
                paragraphs: ['Balancer only uses cookies it needs to work, so it does not ask for consent:'],
                bullets: [
                    'balancer_session — keeps you signed in.',
                    'XSRF-TOKEN — protects your account against forged requests.',
                    'appearance and sidebar_state — remember your light/dark and layout choices.',
                ],
            },
            {
                heading: 'Who else handles your data',
                bullets: [
                    'Hostinger hosts the servers and database where all Balancer data is stored, and keeps its own short-lived web server access logs.',
                    'Bunny Fonts (fonts.bunny.net) serves the typeface; your browser sends it your IP address when loading a page. Bunny Fonts does not log or track visitors.',
                ],
                after: ['Nobody else receives your data unless the law requires it.'],
            },
            {
                heading: 'Who can see it',
                paragraphs: [
                    'The admin screens show account details (name, email, currency, sign-up date) and bug reports. They do not show your finance records. If you ask for a password reset, an admin creates a single-use link and sends it to you personally.',
                ],
            },
            {
                heading: 'How long we keep it',
                bullets: [
                    'Account and finance records: until you delete your account. Deleting it in Settings permanently removes the account together with all its finance records and bug reports.',
                    'Session records: removed after 30 days of inactivity or when you log out.',
                    'Server logs: deleted after 14 days.',
                    'Password reset links: expire after 24 hours or once used.',
                ],
            },
            {
                heading: 'Your rights',
                paragraphs: [
                    `You can access, correct, delete or receive a copy of your data, and object to or restrict how we use it. Most details can be changed or deleted directly in Settings; for anything else, email ${contactEmail}. We reply within one month.`,
                    'You can also complain to the data protection authority in the EU country where you live or work.',
                ],
            },
            {
                heading: 'Security',
                paragraphs: [
                    'All traffic is encrypted with HTTPS, passwords are hashed, and access to the server is limited to the operator. No system is perfectly secure; if a breach affects your data we will tell you and the authorities as the GDPR requires.',
                ],
            },
            {
                heading: 'Age',
                paragraphs: ['Balancer is not meant for anyone under 16.'],
            },
            {
                heading: 'Changes',
                paragraphs: ['If this policy changes, the date at the top changes too. Significant changes will be announced in the app.'],
            },
        ],
    } satisfies LegalDocument,

    terms: {
        headTitle: 'Terms of use',
        title: 'Terms of use',
        intro: `These terms apply when you use Balancer, run by ${operator}. By creating an account you accept them.`,
        sections: [
            {
                heading: 'The service',
                paragraphs: [
                    'Balancer helps you keep track of your own money by recording figures you enter yourself. It is free to use and is still in early access, so features can change.',
                ],
            },
            {
                heading: 'Your account',
                bullets: [
                    'You must be at least 16 and give accurate details.',
                    'One account per person. Keep your password to yourself; you are responsible for what happens under your account.',
                    'If you think someone else has access, change your password and let us know.',
                ],
            },
            {
                heading: 'Your data',
                paragraphs: [
                    'Everything you enter stays yours. You let us store and process it only to run Balancer for you, as described in the privacy policy.',
                ],
            },
            {
                heading: 'Not financial advice',
                paragraphs: [
                    'Balancer’s totals, budgets and statistics are calculated from what you type and are only as accurate as that input. Nothing in Balancer is financial, tax or legal advice, and it does not replace your bank statements.',
                ],
            },
            {
                heading: 'Fair use',
                paragraphs: ['Don’t misuse Balancer. In particular, don’t:'],
                bullets: [
                    'try to access other people’s accounts or data;',
                    'attack, overload, scan or reverse-engineer the service;',
                    'use automated tools to create accounts or send requests in bulk;',
                    'use it for anything illegal.',
                ],
            },
            {
                heading: 'Availability',
                paragraphs: [
                    'We aim to keep Balancer running and your data safe, but can’t promise it will always be available or error-free. We may change or stop the service; if we stop it, we will give reasonable notice where possible. Keep your own copy of anything you can’t afford to lose.',
                ],
            },
            {
                heading: 'Liability',
                paragraphs: [
                    'Balancer is provided as is. As far as the law allows, we are not liable for indirect or consequential loss, or for decisions you make based on figures in the app. Nothing in these terms limits rights you have under consumer law that cannot be limited.',
                ],
            },
            {
                heading: 'Ending your account',
                paragraphs: [
                    'You can delete your account at any time in Settings. We may suspend or delete an account that breaks these terms, and will tell you why unless the law prevents it.',
                ],
            },
            {
                heading: 'Changes and contact',
                paragraphs: [
                    `We may update these terms; the date at the top shows the latest version, and significant changes will be announced in the app. Questions: ${contactEmail}.`,
                ],
            },
        ],
    } satisfies LegalDocument,
} as const;
