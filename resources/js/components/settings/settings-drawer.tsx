import SettingsPanel from '@/components/settings/settings-panel';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useSettings } from '@/contexts/settings';

/** Desktop-only settings sheet. Mobile uses the Settings carousel card. */
export default function SettingsDrawer() {
    const { open, setOpen, isDesktop } = useSettings();

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
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>Account, money display, and finance tools.</SheetDescription>
                </SheetHeader>

                <div className="px-4 py-4">
                    <SettingsPanel idPrefix="drawer-settings" />
                </div>
            </SheetContent>
        </Sheet>
    );
}
