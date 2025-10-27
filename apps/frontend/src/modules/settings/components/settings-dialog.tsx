import React, { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { useSettingsStore } from "../stores/settings-store";
import { Switch } from "../../../components/ui/switch";
import { Label } from "../../../components/ui/label";
import { cn } from "../../../lib/utils";

interface SettingsDialogProps {
    open : boolean;
    onOpenChange : ( open : boolean ) => void;
    container ?: HTMLElement | null;
}

interface NavigationSection {
    id : string;
    label : string;
    items : Array<{
        id : string;
        label : string;
    }>;
}

const NAV_SECTIONS : NavigationSection[] = [
    {
        id: "app",
        label: "App",
        items: [
            { id: "general", label: "General" },
            { id: "notifications", label: "Notifications" },
        ],
    },
    {
        id: "support",
        label: "Support",
        items: [
            { id: "about", label: "About EyeNote" },
        ],
    },
];

export const SettingsDialog : React.FC<SettingsDialogProps> = ( {
    open,
    onOpenChange,
    container,
} ) => {
    const { settings, initialize, isInitialized, toggle } = useSettingsStore();
    const [ activeItem, setActiveItem ] = useState<string>( NAV_SECTIONS[ 0 ]?.items[ 0 ]?.id ?? "general" );

    useEffect( () => {
        void initialize();
    }, [ initialize ] );

    useEffect( () => {
        if ( !open ) {
            setActiveItem( NAV_SECTIONS[ 0 ]?.items[ 0 ]?.id ?? "general" );
        }
    }, [ open ] );

    const isLoading = !isInitialized;

    const renderedSection = useMemo( () => {
        switch ( activeItem ) {
            case "general":
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">General Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure core EyeNote behaviour for content capture and overlays.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start justify-between rounded-md border border-border/60 bg-muted/40 p-4">
                                <div className="pr-4">
                                    <Label htmlFor="settings-enabled" className="text-sm font-medium">
                                        Enable EyeNote
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Toggle the in-page overlays and note capture features on the current browser
                                        profile.
                                    </p>
                                </div>
                                <Switch
                                    id="settings-enabled"
                                    checked={settings.enabled}
                                    disabled={isLoading}
                                    onCheckedChange={() => toggle( "enabled" )}
                                />
                            </div>
                        </div>
                    </div>
                );
            case "notifications":
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">Notifications</h3>
                            <p className="text-sm text-muted-foreground">
                                Stay up to date with activity from your groups and shared pages.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start justify-between rounded-md border border-border/60 bg-muted/40 p-4">
                                <div className="pr-4">
                                    <Label htmlFor="settings-notification-sound" className="text-sm font-medium">
                                        Notification sounds
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Play a gentle chime whenever a new collaborative note is shared with you.
                                    </p>
                                </div>
                                <Switch
                                    id="settings-notification-sound"
                                    checked={settings.notificationSound}
                                    disabled={isLoading}
                                    onCheckedChange={() => toggle( "notificationSound" )}
                                />
                            </div>
                            <div className="flex items-start justify-between rounded-md border border-border/60 bg-muted/40 p-4">
                                <div className="pr-4">
                                    <Label htmlFor="settings-unread-badge" className="text-sm font-medium">
                                        Show unread badge
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Display an unread badge on the extension icon when there are fresh updates.
                                    </p>
                                </div>
                                <Switch
                                    id="settings-unread-badge"
                                    checked={settings.showUnreadBadge}
                                    disabled={isLoading}
                                    onCheckedChange={() => toggle( "showUnreadBadge" )}
                                />
                            </div>
                        </div>
                    </div>
                );
            case "about":
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">About EyeNote</h3>
                            <p className="text-sm text-muted-foreground">
                                Collaborate on any webpage by capturing notes, sharing context, and keeping your team
                                aligned. Hotkeys, overlays, and more are coming soon.
                            </p>
                        </div>
                        <div className="rounded-md border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                            <p>
                                Open this panel anytime with <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">CMD</kbd>{" "}
                                + <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">SHIFT</kbd>{" "}
                                + <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">,</kbd>. On Windows and Linux,
                                try <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">CTRL</kbd>{" "}
                                + <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">SHIFT</kbd>{" "}
                                + <kbd className="rounded bg-background px-1.5 py-0.5 text-xs">,</kbd>.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }, [ activeItem, settings, toggle, isLoading ] );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                container={container ?? undefined}
                className="h-[600px] w-[720px] max-w-none overflow-hidden p-0"
            >
                <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Settings</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Tailor EyeNote to your workflow. These preferences sync wherever you use the extension.
                    </p>
                </DialogHeader>
                <div className="flex h-full">
                    <aside className="w-60 border-r border-border/60 bg-muted/30 p-4">
                        <div className="space-y-6">
                            {NAV_SECTIONS.map( ( section ) => (
                                <div key={section.id} className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground/70">
                                        {section.label}
                                    </p>
                                    <div className="space-y-1">
                                        {section.items.map( ( item ) => {
                                            const isActive = activeItem === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={cn(
                                                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                                                        isActive
                                                            ? "bg-background text-primary shadow-sm"
                                                            : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                                                    )}
                                                    onClick={() => setActiveItem( item.id )}
                                                >
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        } )}
                                    </div>
                                </div>
                            ) )}
                        </div>
                    </aside>
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Loading preferences…
                            </div>
                        ) : (
                            renderedSection
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
