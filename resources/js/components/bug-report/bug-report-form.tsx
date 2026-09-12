import { apiFetch } from '@/api/client';
import { dashboardCopy } from '@/config/dashboard-copy';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { type BugReportType, type BugReportView, type BugReportZone } from '@/types/api';
import { useEffect, useState, type FormEvent } from 'react';

const selectCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900';

const textareaCls =
    'flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900';

const TYPES: { value: BugReportType; label: string }[] = [
    { value: 'visual', label: dashboardCopy.bugReport.types.visual },
    { value: 'functional', label: dashboardCopy.bugReport.types.functional },
    { value: 'composite', label: dashboardCopy.bugReport.types.composite },
];

const ZONES: { value: BugReportZone; label: string }[] = [
    { value: 'balance-sheet', label: dashboardCopy.bugReport.zones['balance-sheet'] },
    { value: 'creator-suite', label: dashboardCopy.bugReport.zones['creator-suite'] },
    { value: 'statistics', label: dashboardCopy.bugReport.zones.statistics },
    { value: 'budget', label: dashboardCopy.bugReport.zones.budget },
    { value: 'past-balance-sheets', label: dashboardCopy.bugReport.zones['past-balance-sheets'] },
    { value: 'settings', label: dashboardCopy.bugReport.zones.settings },
    { value: 'dashboard', label: dashboardCopy.bugReport.zones.dashboard },
    { value: 'login', label: dashboardCopy.bugReport.zones.login },
    { value: 'other', label: dashboardCopy.bugReport.zones.other },
];

const VIEWS: { value: BugReportView; label: string }[] = [
    { value: 'desktop', label: dashboardCopy.bugReport.views.desktop },
    { value: 'mobile', label: dashboardCopy.bugReport.views.mobile },
];

export default function BugReportForm({ idPrefix = 'bug-report' }: { idPrefix?: string }) {
    const isMobile = useIsMobile();
    const [type, setType] = useState<BugReportType | ''>('');
    const [zone, setZone] = useState<BugReportZone | ''>('');
    const [view, setView] = useState<BugReportView>('desktop');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setView(isMobile ? 'mobile' : 'desktop');
    }, [isMobile]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);

        try {
            await apiFetch('/api/v1/bug-reports', {
                method: 'POST',
                notifyFinance: false,
                toast: dashboardCopy.bugReport.thanks,
                body: JSON.stringify({ type, zone, view, description: description.trim() }),
            });
            setType('');
            setZone('');
            setDescription('');
        } catch {
            // Error toast comes from apiFetch.
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-type`}>{dashboardCopy.bugReport.type}</Label>
                <select
                    id={`${idPrefix}-type`}
                    required
                    className={selectCls}
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value as BugReportType);
                    }}
                    aria-label={dashboardCopy.bugReport.typeAria}
                >
                    <option value="" disabled>
                        {dashboardCopy.bugReport.typePlaceholder}
                    </option>
                    {TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-zone`}>{dashboardCopy.bugReport.where}</Label>
                <select
                    id={`${idPrefix}-zone`}
                    required
                    className={selectCls}
                    value={zone}
                    onChange={(e) => {
                        setZone(e.target.value as BugReportZone);
                    }}
                    aria-label={dashboardCopy.bugReport.whereAria}
                >
                    <option value="" disabled>
                        {dashboardCopy.bugReport.wherePlaceholder}
                    </option>
                    {ZONES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-view`}>{dashboardCopy.bugReport.using}</Label>
                <select
                    id={`${idPrefix}-view`}
                    required
                    className={selectCls}
                    value={view}
                    onChange={(e) => {
                        setView(e.target.value as BugReportView);
                    }}
                    aria-label={dashboardCopy.bugReport.usingAria}
                >
                    {VIEWS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-description`}>{dashboardCopy.bugReport.whatHappened}</Label>
                <textarea
                    id={`${idPrefix}-description`}
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={5}
                    className={textareaCls}
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                    }}
                    placeholder={dashboardCopy.bugReport.placeholder}
                />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
                {busy ? dashboardCopy.bugReport.sending : dashboardCopy.bugReport.send}
            </Button>
        </form>
    );
}
