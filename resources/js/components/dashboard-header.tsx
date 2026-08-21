import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/settings';
import { Settings } from 'lucide-react';

export default function DashboardHeader() {
    const { openSettings } = useSettings();

    return (
        <header className="fixed inset-x-0 top-3 z-30 mx-4 h-14 rounded-full bg-white/40 shadow-sm backdrop-blur-md dark:bg-neutral-950/70 dark:shadow-neutral-950/60 md:mx-8">
            <div className="flex h-full items-center justify-between px-4">
                {/* Left — theme (+ settings gear on desktop only) */}
                <div className="flex items-center gap-1">
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
                </div>

                {/* Centre — logo switches with theme */}
                <div className="flex flex-1 items-center justify-center">
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

                {/* Right — balance for logo centering */}
                <div className="w-[4.5rem]" aria-hidden />
            </div>
        </header>
    );
}
