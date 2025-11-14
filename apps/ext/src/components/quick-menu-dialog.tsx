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
import type { OverlayShortcutId, QuickLaunchMenuId } from "../shortcuts/overlay-shortcuts";

const dialogClassName =
    "w-[min(95vw,520px)] max-h-[80vh] p-0 overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl";

type QuickMenuItem = {
    id : QuickLaunchMenuId;
    shortcutId : OverlayShortcutId;
    label : string;
    description : string;
    shortcutDisplay ?: string;
    disabled ?: boolean;
};

interface QuickMenuDialogProps {
    open : boolean;
    dialogContainer ?: HTMLElement | null;
    onSelect : ( item : QuickMenuItem ) => void;
    onOpenChange : ( open : boolean ) => void;
    items : QuickMenuItem[];
}

export const QuickMenuDialog : React.FC<QuickMenuDialogProps> = ( {
    open,
    dialogContainer,
    onOpenChange,
    onSelect,
    items,
} ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            container={dialogContainer ?? undefined}
            className={dialogClassName}
        >
            <div className="flex h-full flex-col">
                <div className="border-b border-border/50 bg-muted/30 px-6 py-5">
                    <DialogHeader className="space-y-1 text-left">
                        <DialogTitle>Quick Launch</DialogTitle>
                        <DialogDescription>
                            Jump straight to common tools without losing focus on the page.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col divide-y divide-border/40 p-3 gap-10">
                        {items.map( ( item ) => {
                            const shortcutLabel = item.shortcutDisplay ?? null;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-center gap-5 px-6 py-4 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        item.disabled && "pointer-events-none opacity-60"
                                    )}
                                    onClick={() => onSelect( item )}
                                    disabled={item.disabled}
                                >
                                    <div className="flex flex-1 flex-col">
                                        <span className="text-sm font-semibold text-foreground">{item.label}</span>
                                        <span className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                            {item.description}
                                        </span>
                                    </div>
                                    {shortcutLabel ? (
                                        <kbd className="ml-auto inline-flex min-w-[3.5rem] items-center justify-center rounded-md border border-border bg-secondary/70 px-3 py-1 text-[11px] font-mono tracking-wide text-secondary-foreground">
                                            {shortcutLabel}
                                        </kbd>
                                    ) : null}
                                </button>
                            );
                        } )}
                    </div>
                </div>
                <DialogFooter className="border-t border-border/50 bg-muted/30 px-6 py-4">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </div>
        </DialogContent>
    </Dialog>
);

export type { QuickMenuItem };
