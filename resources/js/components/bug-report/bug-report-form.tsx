import { apiFetch } from '@/api/client';
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
    { value: 'visual', label: 'Looks wrong' },
    { value: 'functional', label: "Doesn't work" },
    { value: 'composite', label: 'Both' },
];

const ZONES: { value: BugReportZone; label: string }[] = [
    { value: 'balance-sheet', label: 'Balance Sheet' },
    { value: 'creator-suite', label: 'Ledger' },
        { value: 'statistics', label: 'Statistics' },
        { value: 'budget', label: 'Budget' },
        { value: 'past-balance-sheets', label: 'Past Balance Sheets' },
    { value: 'settings', label: 'Settings' },
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'login', label: 'Login' },
    { value: 'other', label: 'Other' },
];

const VIEWS: { value: BugReportView; label: string }[] = [
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
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
                toast: 'Thanks — we got it.',
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
                <Label htmlFor={`${idPrefix}-type`}>Type</Label>
                <select
                    id={`${idPrefix}-type`}
                    required
                    className={selectCls}
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value as BugReportType);
                    }}
                    aria-label="Issue type"
                >
                    <option value="" disabled>
                        What kind of issue?
                    </option>
                    {TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-zone`}>Where</Label>
                <select
                    id={`${idPrefix}-zone`}
                    required
                    className={selectCls}
                    value={zone}
                    onChange={(e) => {
                        setZone(e.target.value as BugReportZone);
                    }}
                    aria-label="Where it happened"
                >
                    <option value="" disabled>
                        Where did it happen?
                    </option>
                    {ZONES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-view`}>I was using</Label>
                <select
                    id={`${idPrefix}-view`}
                    required
                    className={selectCls}
                    value={view}
                    onChange={(e) => {
                        setView(e.target.value as BugReportView);
                    }}
                    aria-label="Desktop or mobile"
                >
                    {VIEWS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor={`${idPrefix}-description`}>What happened</Label>
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
                    placeholder="What you expected, and what you saw instead."
                />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Sending…' : 'Send report'}
            </Button>
        </form>
    );
}
