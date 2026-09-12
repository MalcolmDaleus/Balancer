import { ledgerCopy } from '@/config/ledger-copy';
import { useEffect, useRef, useState } from 'react';
import { AddButton, SubTabBar, TabToolbar } from './shared';
import { IncomeArchivePanel } from './income/archive-panel';
import { IncomeEntriesPanel } from './income/entries-panel';
import { IncomeSchedulesPanel } from './income/schedules-panel';
import type { LedgerFocus } from './ledger-focus';

const SUBTABS = ['Schedules', 'Entries', 'Archive'] as const;
type SubTab = (typeof SUBTABS)[number];

export function IncomeTab({
    active,
    focus,
    onFocusConsumed,
}: {
    active: boolean;
    focus?: LedgerFocus | null;
    onFocusConsumed?: () => void;
}) {
    const [sub, setSub] = useState<SubTab>('Schedules');
    const addRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (focus?.domain === 'income') {
            setSub('Entries');
        }
    }, [focus]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <TabToolbar>
                <SubTabBar tabs={[...SUBTABS]} active={sub} onChange={(t) => setSub(t as SubTab)} labels={ledgerCopy.income.sub} />
                {sub !== 'Archive' && <AddButton onClick={() => addRef.current?.()} />}
            </TabToolbar>
            {sub === 'Schedules' && <IncomeSchedulesPanel addRef={addRef} active={active} />}
            {sub === 'Entries' && (
                <IncomeEntriesPanel addRef={addRef} active={active} focus={focus} onFocusConsumed={onFocusConsumed} />
            )}
            {sub === 'Archive' && <IncomeArchivePanel active={active} />}
        </div>
    );
}
