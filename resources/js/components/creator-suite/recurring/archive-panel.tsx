import { useFormatMoney } from '@/hooks/use-format-money';
import type { RecurringStream } from '@/types/api';
import { ArchiveTabPanel } from '../archive-tab';
import { fmtRecurringFreq } from '../schedule-primitives';
import { currentEntry } from './streams-panel';

export function RecurringArchivePanel({ active }: { active: boolean }) {
    const fmtAmount = useFormatMoney();

    return (
        <ArchiveTabPanel<RecurringStream>
            active={active}
            listUrl="/api/v1/recurring-payments/streams?archived=1"
            restoreUrl={(id) => `/api/v1/recurring-payments/streams/${id}/restore`}
            forceUrl={(id) => `/api/v1/recurring-payments/streams/${id}/force`}
            emptyLabel="No archived streams."
            renderDetail={(s) => {
                const e = currentEntry(s);
                const cat = s.category?.name ?? 'Uncategorized';
                return e ? `${cat} · ${fmtRecurringFreq(e.frequency)} · ${fmtAmount(e.amount)}` : cat;
            }}
        />
    );
}
