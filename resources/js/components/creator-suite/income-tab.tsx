import { useRef, useState } from 'react';
import { AddButton, SubTabBar, TabToolbar } from './shared';
import { IncomeArchivePanel } from './income/archive-panel';
import { IncomeEntriesPanel } from './income/entries-panel';
import { IncomeSchedulesPanel } from './income/schedules-panel';

const SUBTABS = ['Schedules', 'Entries', 'Archive'] as const;
type SubTab = (typeof SUBTABS)[number];

export function IncomeTab({ active }: { active: boolean }) {
    const [sub, setSub] = useState<SubTab>('Schedules');
    const addRef = useRef<(() => void) | null>(null);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} />
                {sub !== 'Archive' && <AddButton onClick={() => addRef.current?.()} />}
            </TabToolbar>
            {sub === 'Schedules' && <IncomeSchedulesPanel addRef={addRef} active={active} />}
            {sub === 'Entries' && <IncomeEntriesPanel addRef={addRef} active={active} />}
            {sub === 'Archive' && <IncomeArchivePanel active={active} />}
        </div>
    );
}
