import BugReportForm from '@/components/bug-report/bug-report-form';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBugReport } from '@/contexts/bug-report';

/** Desktop-only bug report sheet. Mobile uses the carousel card. */
export default function BugReportDrawer() {
    const { open, setOpen, isDesktop } = useBugReport();

    if (!isDesktop) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent
                side="right"
                className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
            >
                <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
                    <SheetTitle>Report a problem</SheetTitle>
                    <SheetDescription>Tell us what went wrong. This stays in the app for friend testing.</SheetDescription>
                </SheetHeader>

                <div className="px-4 py-4">
                    <BugReportForm idPrefix="drawer-bug-report" />
                </div>
            </SheetContent>
        </Sheet>
    );
}
