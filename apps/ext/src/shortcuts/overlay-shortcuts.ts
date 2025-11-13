import {
    createShortcutRegistry,
    type ShortcutDefinition,
} from "@eye-note/shortcuts";
import {
    EVENT_OPEN_GROUP_MANAGER,
    EVENT_OPEN_NOTIFICATIONS_PANEL,
    EVENT_OPEN_SETTINGS_DIALOG,
} from "@eye-note/definitions";

export type OverlayShortcutId =
    | "overlay.openGroupManager"
    | "overlay.openNotifications"
    | "overlay.openSettings";

const overlayShortcutDefinitions : ShortcutDefinition<OverlayShortcutId>[] = [
    {
        id: "overlay.openGroupManager",
        label: "Open group manager",
        description: "Opens the collaboration groups sidebar",
        combo: "Shift+G",
        scope: "overlay",
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_GROUP_MANAGER,
        },
    },
    {
        id: "overlay.openNotifications",
        label: "Open notifications",
        description: "Shows the notifications sidebar",
        combo: "Shift+N",
        scope: "overlay",
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_NOTIFICATIONS_PANEL,
        },
    },
    {
        id: "overlay.openSettings",
        label: "Open settings",
        description: "Opens the extension settings sidebar",
        combo: "Shift+S",
        scope: "overlay",
        preventDefault: true,
        action: {
            type: "event",
            eventName: EVENT_OPEN_SETTINGS_DIALOG,
        },
    },
];

export const overlayShortcutRegistry = createShortcutRegistry<OverlayShortcutId>( overlayShortcutDefinitions );
