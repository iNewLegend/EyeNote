import {
    createShortcutRegistry,
    type ShortcutDefinition,
} from "@eye-note/shortcuts";
import {
    EVENT_OPEN_GROUP_MANAGER,
    EVENT_OPEN_NOTIFICATIONS_PANEL,
    EVENT_OPEN_SETTINGS_DIALOG,
} from "@eye-note/definitions";

export const QUICK_LAUNCH_MENU_GROUPS = "groups" as const;
export const QUICK_LAUNCH_MENU_NOTIFICATIONS = "notifications" as const;
export const QUICK_LAUNCH_MENU_SETTINGS = "settings" as const;

export type QuickLaunchMenuId =
    | typeof QUICK_LAUNCH_MENU_GROUPS
    | typeof QUICK_LAUNCH_MENU_NOTIFICATIONS
    | typeof QUICK_LAUNCH_MENU_SETTINGS;

export type OverlayShortcutId =
    | "overlay.openGroupManager"
    | "overlay.openNotifications"
    | "overlay.openSettings";

export interface OverlayShortcutMeta {
    quickLaunch ?: {
        menuId : QuickLaunchMenuId;
        description : string | ( ( context : { unreadCount : number } ) => string );
        sort ?: number;
        label ?: string;
    };
}

export interface OverlayQuickLaunchItem {
    menuId : QuickLaunchMenuId;
    shortcutId : OverlayShortcutId;
    label : string;
    description : string;
    sort : number;
}

const overlayShortcutDefinitions : ShortcutDefinition<OverlayShortcutId, OverlayShortcutMeta>[] = [
    {
        id: "overlay.openGroupManager",
        label: "Open group manager",
        description: "Opens the collaboration groups sidebar",
        combo: "Shift+G",
        scope: "overlay",
        allowWhileTyping: true,
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_GROUP_MANAGER,
        },
        meta: {
            quickLaunch: {
                menuId: QUICK_LAUNCH_MENU_GROUPS,
                description: "Manage collaboration groups, invites, and member roles.",
                sort: 1,
            },
        },
    },
    {
        id: "overlay.openNotifications",
        label: "Open notifications",
        description: "Shows the notifications sidebar",
        combo: "Shift+N",
        scope: "overlay",
        allowWhileTyping: true,
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_NOTIFICATIONS_PANEL,
        },
        meta: {
            quickLaunch: {
                menuId: QUICK_LAUNCH_MENU_NOTIFICATIONS,
                description: ( { unreadCount } ) =>
                    unreadCount > 0
                        ? `${ unreadCount } unread alert${ unreadCount === 1 ? "" : "s" }`
                        : "Review recent alerts from your groups.",
                sort: 2,
            },
        },
    },
    {
        id: "overlay.openSettings",
        label: "Open settings",
        description: "Opens the extension settings sidebar",
        combo: "Shift+S",
        scope: "overlay",
        allowWhileTyping: true,
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_SETTINGS_DIALOG,
        },
        meta: {
            quickLaunch: {
                menuId: QUICK_LAUNCH_MENU_SETTINGS,
                description: "Adjust overlay preferences without leaving the page.",
                sort: 3,
            },
        },
    },
];

export const overlayShortcutRegistry = createShortcutRegistry<OverlayShortcutId, OverlayShortcutMeta>( overlayShortcutDefinitions );

export function getOverlayQuickLaunchItems ( context : { unreadCount : number } ) : OverlayQuickLaunchItem[] {
    return overlayShortcutRegistry
        .list()
        .map( ( definition ) => {
            const quickLaunch = definition.meta?.quickLaunch;
            if ( !quickLaunch ) {
                return null;
            }

            const resolvedDescription = typeof quickLaunch.description === "function"
                ? quickLaunch.description( context )
                : quickLaunch.description;

            return {
                menuId: quickLaunch.menuId,
                shortcutId: definition.id,
                label: quickLaunch.label ?? definition.label,
                description: resolvedDescription,
                sort: quickLaunch.sort ?? 0,
            } satisfies OverlayQuickLaunchItem;
        } )
        .filter( ( item ): item is OverlayQuickLaunchItem => item !== null )
        .sort( ( a, b ) => a.sort - b.sort );
}
