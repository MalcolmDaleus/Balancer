import { useFormatMoney } from '@/hooks/use-format-money';
import type { RegularIncomeSchedule } from '@/types/api';
import { ArchiveTabPanel } from '../archive-tab';
import { currentVersion, fmtIncomeFreq } from './schedules-panel';

export function IncomeArchivePanel({ active }: { active: boolean }) {
    const fmtAmount = useFormatMoney();

    return (
        <ArchiveTabPanel<RegularIncomeSchedule>
            active={active}
            listUrl="/api/v1/income/schedules?archived=1"
            restoreUrl={(id) => `/api/v1/income/schedules/${id}/restore`}
            forceUrl={(id) => `/api/v1/income/schedules/${id}/force`}
            emptyLabel="No archived schedules."
            renderDetail={(s) => {
                const v = currentVersion(s);
                return v ? `${fmtIncomeFreq(v.frequency)} · ${fmtAmount(v.amount_cents)}` : 'No version';
            }}
        />
    );
}
