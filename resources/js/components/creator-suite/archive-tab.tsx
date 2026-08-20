/**
 * Generic archive list for soft-deleted income schedules / recurring streams.
 */
import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { ReactNode, useEffect, useState } from 'react';
import { ApiError, ConfirmModal, EmptyRows, ListRow, ListStack, LoadingRows, rowDetailCls, rowTitleCls } from './shared';

export type ArchiveItem = {
    id: number;
    name: string;
};

type Props<T extends ArchiveItem> = {
    active: boolean;
    listUrl: string;
    restoreUrl: (id: number) => string;
    forceUrl: (id: number) => string;
    emptyLabel: string;
    renderDetail: (item: T) => ReactNode;
};

export function ArchiveTabPanel<T extends ArchiveItem>({
    active,
    listUrl,
    restoreUrl,
    forceUrl,
    emptyLabel,
    renderDetail,
}: Props<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [hardDeleting, setHardDeleting] = useState<number | null>(null);
    const [hardDeleteTarget, setHardDeleteTarget] = useState<T | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await apiFetchList<T>(listUrl));
            setFetched(true);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (active && !fetched) void load();
    }, [active, fetched]);

    const handleRestore = async (item: T) => {
        setRestoring(item.id);
        try {
            await apiFetch(restoreUrl(item.id), { method: 'PATCH' });
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRestoring(null);
        }
    };

    const handleHardDelete = async (item: T) => {
        setHardDeleting(item.id);
        setHardDeleteTarget(null);
        try {
            await apiFetch(forceUrl(item.id), { method: 'DELETE' });
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setHardDeleting(null);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {error && (
                <div className="mb-3">
                    <ApiError message={error} onDismiss={() => setError(null)} />
                </div>
            )}
            {hardDeleteTarget && (
                <ConfirmModal
                    message={`Permanently delete "${hardDeleteTarget.name}"? This cannot be undone.`}
                    confirmLabel="Delete permanently"
                    confirmVariant="danger"
                    onConfirm={() => handleHardDelete(hardDeleteTarget)}
                    onCancel={() => setHardDeleteTarget(null)}
                />
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
                <ListStack>
                    {loading && <LoadingRows />}
                    {!loading && !items.length && <EmptyRows label={emptyLabel} />}
                    {items.map((item) => {
                        const isRestoring = restoring === item.id;
                        const isDeleting = hardDeleting === item.id;
                        return (
                            <ListRow key={item.id} disabled>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className={`${rowTitleCls} line-through opacity-60`}>{item.name}</p>
                                        <p className={`mt-0.5 truncate ${rowDetailCls} opacity-60`}>{renderDetail(item)}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={isRestoring || isDeleting}
                                            onClick={() => handleRestore(item)}
                                            className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                        >
                                            {isRestoring ? 'Restoring…' : 'Restore'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isRestoring || isDeleting}
                                            onClick={() => setHardDeleteTarget(item)}
                                            className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                                        >
                                            {isDeleting ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </ListRow>
                        );
                    })}
                </ListStack>
            </div>
        </div>
    );
}
