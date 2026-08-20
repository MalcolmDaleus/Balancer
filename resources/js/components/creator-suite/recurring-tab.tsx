import { useRef, useState } from 'react';
import { AddButton, SubTabBar, TabToolbar } from './shared';
import { RecurringArchivePanel } from './recurring/archive-panel';
import { RecurringCategoriesPanel } from './recurring/categories-panel';
import { RecurringStreamsPanel } from './recurring/streams-panel';

const SUBTABS = ['Streams', 'Categories', 'Archive'] as const;
type SubTab = (typeof SUBTABS)[number];

export function RecurringTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Streams');
    const addRef = useRef<(() => void) | null>(null);
    const showAdd = sub !== 'Archive';

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                {showAdd && <AddButton onClick={() => addRef.current?.()} />}
            </TabToolbar>
            {sub === 'Streams' && <RecurringStreamsPanel addRef={addRef} active={active} />}
            {sub === 'Categories' && <RecurringCategoriesPanel addRef={addRef} active={active} />}
            {sub === 'Archive' && <RecurringArchivePanel active={active} />}
        </div>
    );
}
