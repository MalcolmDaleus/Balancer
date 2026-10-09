import { legalCopy, type LegalDocument } from '@/config/legal-copy';
import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';

export default function Legal({ document }: { document: 'privacy' | 'terms' }) {
    const doc: LegalDocument = legalCopy[document];

    return (
        <PublicLayout>
            <Head title={doc.headTitle} />
            <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
                <div className="rounded-[1.6rem] bg-white p-7 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-10 dark:bg-neutral-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] dark:ring-1 dark:ring-white/8">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase dark:text-neutral-400">
                        {legalCopy.updatedLabel} · {legalCopy.updated}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-neutral-300">{doc.intro}</p>

                    <div className="mt-10 space-y-8">
                        {doc.sections.map((section) => (
                            <section key={section.heading}>
                                <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
                                {section.paragraphs?.map((paragraph) => (
                                    <p key={paragraph} className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                        {paragraph}
                                    </p>
                                ))}
                                {section.bullets ? (
                                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 marker:text-slate-400 dark:text-neutral-300">
                                        {section.bullets.map((bullet) => (
                                            <li key={bullet}>{bullet}</li>
                                        ))}
                                    </ul>
                                ) : null}
                                {section.after?.map((paragraph) => (
                                    <p key={paragraph} className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                                        {paragraph}
                                    </p>
                                ))}
                            </section>
                        ))}
                    </div>
                </div>
            </article>
        </PublicLayout>
    );
}
