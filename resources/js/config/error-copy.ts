export type ErrorStatus = 403 | 404 | 500 | 503;

export const errorCopy = {
    home: 'Back to Balancer',
    reload: 'Try again',
    pages: {
        403: {
            title: 'Not for you',
            body: 'You don’t have access to this page.',
        },
        404: {
            title: 'Page not found',
            body: 'This page doesn’t exist or has moved.',
        },
        500: {
            title: 'Something went wrong',
            body: 'An unexpected error stopped this page from loading. Your data is safe; try again in a moment.',
        },
        503: {
            title: 'Back shortly',
            body: 'Balancer is being updated. This usually takes a minute or two.',
        },
    } satisfies Record<ErrorStatus, { title: string; body: string }>,
};
