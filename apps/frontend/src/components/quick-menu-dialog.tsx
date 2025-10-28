import React from "react";

import {
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    cn,
} from "@eye-note/ui";

const dialogClassName =
    "max-h-[85vh] overflow-y-auto w-[min(90vw,480px)] max-w-[480px] space-y-6";

type QuickMenuItemId = "groups" | "settings";

type QuickMenuItem = {
    id: QuickMenuItemId;
    label: string;
    description: string;
    shortcut ?: string;
    disabled ?: boolean;
};

const DEFAULT_MENU_ITEMS : QuickMenuItem[] = [
    {
        id: "groups",
        label: "Groups",
        description: "Manage collaboration groups, invites, and member roles.",
        shortcut: "Shift + G",
    },
    {
        id: "settings",
        label: "Settings",
        description: "Configure overlay preferences and notifications.",
        shortcut: "Shift + S",
    },
];

interface QuickMenuDialogProps {
    open : boolean;
    dialogContainer ?: HTMLElement | null;
    onSelect : ( item : QuickMenuItemId ) => void;
    onOpenChange : ( open : boolean ) => void;
    items ?: QuickMenuItem[];
}

export const QuickMenuDialog : React.FC<QuickMenuDialogProps> = ( {
    open,
    dialogContainer,
    onOpenChange,
    onSelect,
    items = DEFAULT_MENU_ITEMS,
} ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            container={dialogContainer ?? undefined}
            className={dialogClassName}
        >
            <DialogHeader>
                <DialogTitle>Quick Launch</DialogTitle>
                <DialogDescription>
                    Jump straight to the most common tools and settings without leaving the page.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
                {items.map( ( item ) => (
                    <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted",
                            item.disabled && "pointer-events-none opacity-60"
                        )}
                        onClick={() => onSelect( item.id )}
                        disabled={item.disabled}
                    >
                        <span>
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                                {item.description}
                            </span>
                        </span>
                        {item.shortcut ? (
                            <kbd className="rounded-md border bg-secondary px-2 py-1 text-[10px] font-mono">
                                {item.shortcut}
                            </kbd>
                        ) : null}
                    </Button>
                ) )}
            </div>
            <DialogFooter className="justify-end">
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export type { QuickMenuItem, QuickMenuItemId };
