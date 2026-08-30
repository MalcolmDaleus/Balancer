import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { useBugReport } from '@/contexts/bug-report';
import { useSettings } from '@/contexts/settings';
import { Bug, Settings } from 'lucide-react';

export default function DashboardHeader() {
    const { openSettings } = useSettings();
    const { openBugReport } = useBugReport();

    return (
        <header className="fixed inset-x-0 top-3 z-30 mx-4 h-14 rounded-full bg-white/40 shadow-sm backdrop-blur-md dark:bg-neutral-950/70 dark:shadow-neutral-950/60 md:mx-8">
            <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-4">
                <div className="flex items-center gap-1 justify-self-start">
                    <AppearanceToggleDropdown />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openSettings}
                        aria-label="Open settings"
                        className="hidden h-9 w-9 text-slate-600 hover:text-slate-900 md:inline-flex dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openBugReport}
                        aria-label="Report a problem"
                        className="h-9 w-9 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                        <Bug className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center justify-center">
                    <img
                        src="/branding/logo_dark.svg"
                        alt="Balancer"
                        className="h-auto w-36 dark:hidden"
                    />
                    <img
                        src="/branding/logo_light.svg"
                        alt="Balancer"
                        className="hidden h-auto w-36 dark:block"
                    />
                </div>

                <div aria-hidden />
            </div>
        </header>
    );
}
