/**
 * Generic category CRUD tab used by purchases, debts, and recurring.
 */
import { apiFetch, apiFetchList, errorMessage } from '@/api/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { MutableRefObject, useEffect, useState } from 'react';
import {
    ApiError,
    ConfirmModal,
    EmptyRows,
    Field,
    FormActions,
    inputCls,
    ListRow,
    ListStack,
    LoadingRows,
    RowActions,
    SplitPane,
    StatusChip,
    rowTitleCls,
} from './shared';

export type CategoryRow = {
    id: number;
    name: string;
    deleted_at?: string | null;
};

type Props = {
    active: boolean;
    addRef?: MutableRefObject<(() => void) | null>;
    listUrl: string;
    storeUrl: string;
    updateUrl: (id: number) => string;
    deleteUrl: (id: number) => string;
    emptyLabel: string;
    deleteConfirmMessage?: (name: string) => string;
};

export function CategoryTab({
    active,
    addRef,
    listUrl,
    storeUrl,
    updateUrl,
    deleteUrl,
    emptyLabel,
    deleteConfirmMessage = (name) => `Remove category "${name}"?`,
}: Props) {
    const isMobile = useIsMobile();
    const [cats, setCats] = useState<CategoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [selected, setSelected] = useState<CategoryRow | null>(null);
    const [confirm, setConfirm] = useState<CategoryRow | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [form, setForm] = useState({ name: '' });

    const load = async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            setCats(await apiFetchList<CategoryRow>(listUrl));
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

    const selectRow = (c: CategoryRow) => {
        setSelected(c);
        setForm({ name: c.name });
        setError(null);
        if (isMobile) setSheetOpen(true);
    };

    const reset = () => {
        setSelected(null);
        setForm({ name: '' });
        setError(null);
        setSheetOpen(false);
    };

    useEffect(() => {
        if (addRef) {
            addRef.current = () => {
                setSelected(null);
                setForm({ name: '' });
                setError(null);
                setSheetOpen(true);
            };
        }
        return () => {
            if (addRef) addRef.current = null;
        };
    }, [addRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (selected) {
                await apiFetch(updateUrl(selected.id), {
                    method: 'PUT',
                    body: JSON.stringify(form),
                    toast: 'Saved',
                });
            } else {
                await apiFetch(storeUrl, { method: 'POST', body: JSON.stringify(form), toast: 'Category added' });
            }
            reset();
            setFetched(false);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c: CategoryRow) => {
        setConfirm(null);
        setRemovingId(c.id);
        try {
            await apiFetch(deleteUrl(c.id), { method: 'DELETE', toast: 'Deleted' });
            if (selected?.id === c.id) reset();
            await load(true);
        } catch (err: unknown) {
            setError(errorMessage(err));
        } finally {
            setRemovingId(null);
        }
    };

    const formContent = (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && <ApiError message={error} onDismiss={() => setError(null)} />}
            <Field label="Name">
                <input
                    type="text"
                    required
                    maxLength={255}
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value })}
                />
            </Field>
            <FormActions isEdit={!!selected} saving={saving} onCancel={reset} />
        </form>
    );

    return (
        <>
            {confirm && (
                <ConfirmModal
                    message={deleteConfirmMessage(confirm.name)}
                    onConfirm={() => handleDelete(confirm)}
                    onCancel={() => setConfirm(null)}
                />
            )}
            <SplitPane
                sheetOpen={sheetOpen}
                onSheetOpenChange={setSheetOpen}
                sheetTitle={selected ? 'Edit Category' : 'New Category'}
                list={
                    <ListStack>
                        {loading && !cats.length && <LoadingRows />}
                        {!loading && !cats.length && <EmptyRows label={emptyLabel} />}
                        {cats.map((c) => (
                            <ListRow key={c.id} selected={selected?.id === c.id} disabled={!!c.deleted_at} busy={removingId === c.id}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className={rowTitleCls}>{c.name}</span>
                                    <div className="flex items-center gap-2">
                                        {c.deleted_at && <StatusChip label="Unlisted" color="amber" />}
                                        {!c.deleted_at && <RowActions onEdit={() => selectRow(c)} onDelete={() => setConfirm(c)} />}
                                    </div>
                                </div>
                            </ListRow>
                        ))}
                    </ListStack>
                }
                form={formContent}
            />
        </>
    );
}
