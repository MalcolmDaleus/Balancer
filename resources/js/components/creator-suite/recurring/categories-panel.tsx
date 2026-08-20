import { MutableRefObject } from 'react';
import { CategoryTab } from '../category-tab';

export function RecurringCategoriesPanel({
    active,
    addRef,
}: {
    active: boolean;
    addRef?: MutableRefObject<(() => void) | null>;
}) {
    return (
        <CategoryTab
            active={active}
            addRef={addRef}
            listUrl="/api/v1/recurring-payments/categories"
            storeUrl="/api/v1/recurring-payments/categories"
            updateUrl={(id) => `/api/v1/recurring-payments/categories/${id}`}
            deleteUrl={(id) => `/api/v1/recurring-payments/categories/${id}`}
            emptyLabel="No recurring categories."
        />
    );
}
