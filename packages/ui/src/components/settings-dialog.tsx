"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

type SettingsDialogItem = {
    id: string;
    label: string;
    description ?: string;
    content: React.ReactNode;
    disabled ?: boolean;
};

type SettingsDialogProps = {
    open: boolean;
    onOpenChange: ( open: boolean ) => void;
    items: SettingsDialogItem[];
    dialogContainer ?: HTMLElement | null;
    title: string;
    description ?: string;
    selectedItemId ?: string;
    onSelectedItemChange ?: ( id: string ) => void;
    footer ?: React.ReactNode | null;
    contentClassName ?: string;
};

export function SettingsDialog ( {
    open,
    onOpenChange,
    items,
    dialogContainer,
    title,
    description,
    selectedItemId,
    onSelectedItemChange,
    footer,
    contentClassName,
} : SettingsDialogProps ) {
    const [ internalSelection, setInternalSelection ] = React.useState( () => items[0]?.id );
    const isControlled = selectedItemId !== undefined;
    const activeItemId = isControlled ? selectedItemId : internalSelection;

    React.useEffect( () => {
        if ( items.length === 0 ) {
            return;
        }
        const hasActiveSelection = items.some( ( item ) => item.id === activeItemId );
        if ( hasActiveSelection ) {
            return;
        }
        const fallbackId = items[0]?.id;
        if ( !fallbackId ) {
            return;
        }
        if ( !isControlled ) {
            setInternalSelection( fallbackId );
        }
        onSelectedItemChange?.( fallbackId );
    }, [ activeItemId, isControlled, items, onSelectedItemChange ] );

    const handleSelect = React.useCallback(
        ( id: string, disabled ?: boolean ) => {
            if ( disabled ) {
                return;
            }
            if ( !isControlled ) {
                setInternalSelection( id );
            }
            onSelectedItemChange?.( id );
        },
        [ isControlled, onSelectedItemChange ]
    );

    const activeItem = items.find( ( item ) => item.id === activeItemId ) ?? items[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                container={dialogContainer ?? undefined}
                className={cn(
                    "flex max-h-[85vh] w-[min(90vw,840px)] max-w-[840px] flex-col gap-6 overflow-hidden",
                    contentClassName
                )}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                {items.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        No sections available.
                    </div>
                ) : (
                    <div className="flex flex-1 gap-6 overflow-hidden">
                        <nav className="w-48 shrink-0 space-y-1 overflow-y-auto pr-2">
                            {items.map( ( item ) => {
                                const isActive = item.id === activeItem?.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelect( item.id, item.disabled )}
                                        className={cn(
                                            "w-full rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors",
                                            isActive
                                                ? "bg-secondary text-secondary-foreground"
                                                : "hover:bg-muted",
                                            item.disabled
                                                ? "cursor-not-allowed opacity-60"
                                                : "cursor-pointer"
                                        )}
                                        disabled={item.disabled}
                                    >
                                        <div className="font-medium">{item.label}</div>
                                        {item.description ? (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.description}
                                            </p>
                                        ) : null}
                                    </button>
                                );
                            } )}
                        </nav>
                        <div className="w-px shrink-0 bg-border" />
                        <section className="flex-1 overflow-y-auto">
                            {activeItem ? (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">{activeItem.label}</h3>
                                        {activeItem.description ? (
                                            <p className="text-sm text-muted-foreground">
                                                {activeItem.description}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-4">{activeItem.content}</div>
                                </div>
                            ) : null}
                        </section>
                    </div>
                )}
                {footer === null ? null : (
                    <DialogFooter className="justify-end">
                        {footer ?? (
                            <DialogClose asChild>
                                <Button variant="outline">Close</Button>
                            </DialogClose>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

export type { SettingsDialogItem, SettingsDialogProps };
