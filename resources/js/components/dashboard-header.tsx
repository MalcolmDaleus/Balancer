import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';
import { router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';

export default function DashboardHeader() {
    const handleLogout = () => {
        router.post(logout().url);
    };

    return (
        <header className="fixed inset-x-0 top-3 z-30 mx-4 h-14 rounded-full bg-white/40 shadow-sm backdrop-blur-md dark:bg-neutral-950/70 dark:shadow-neutral-950/60 md:mx-8">
            <div className="flex h-full items-center justify-between px-4">
                {/* Left — theme toggle */}
                <div className="flex w-24 items-center">
                    <AppearanceToggleDropdown />
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

                {/* Right — logout */}
                <div className="flex w-24 items-center justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Log out</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
