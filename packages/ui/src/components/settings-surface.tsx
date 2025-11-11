"use client";

import * as React from "react";

import { cn } from "@eye-note/ui/src/lib/utils";

import type { SettingsDialogItem } from "@eye-note/ui/src/components/settings-dialog";

type SettingsSurfaceProps = {
    title : string;
    description ?: string;
    items : SettingsDialogItem[];
    selectedItemId ?: string;
    onSelectedItemChange ?: ( id : string ) => void;
    footer ?: React.ReactNode | null;
    className ?: string;
    headerSlot ?: React.ReactNode;
    contentClassName ?: string;
};

export function SettingsSurface ( {
    title,
    description,
    items,
    selectedItemId,
    onSelectedItemChange,
    footer,
    className,
    headerSlot,
    contentClassName,
} : SettingsSurfaceProps ) {
    const [ internalSelection, setInternalSelection ] = React.useState( () => items[ 0 ]?.id );
    const isControlled = selectedItemId !== undefined;
    const activeItemId = isControlled ? selectedItemId : internalSelection;

    React.useEffect( () => {
        if ( items.length === 0 ) {
            return;
        }
        const hasActive = items.some( ( item ) => item.id === activeItemId );
        if ( hasActive ) {
            return;
        }
        const fallbackId = items[ 0 ]?.id;
        if ( !fallbackId ) {
            return;
        }
        if ( !isControlled ) {
            setInternalSelection( fallbackId );
        }
        onSelectedItemChange?.( fallbackId );
    }, [ activeItemId, isControlled, items, onSelectedItemChange ] );

    const handleSelect = React.useCallback(
        ( id : string, disabled ?: boolean ) => {
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

    const activeItem = items.find( ( item ) => item.id === activeItemId ) ?? items[ 0 ];

    return (
        <div
            className={ cn(
                "flex flex-col gap-6 rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70",
                className
            ) }
        >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">{ title }</h2>
                    { description ? (
                        <p className="text-sm text-muted-foreground">{ description }</p>
                    ) : null }
                </div>
                { headerSlot }
            </div>

            { items.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/70 text-sm text-muted-foreground">
                    No settings available yet.
                </div>
            ) : (
                <div
                    className={ cn(
                        "flex flex-1 flex-col gap-6 md:flex-row md:items-start md:gap-8",
                        contentClassName
                    ) }
                >
                    <nav className="flex w-full shrink-0 flex-row gap-2 overflow-x-auto md:w-56 md:flex-col md:space-y-1 md:overflow-visible md:pr-2">
                        { items.map( ( item ) => {
                            const isActive = item.id === activeItem?.id;
                            return (
                                <button
                                    key={ item.id }
                                    type="button"
                                    onClick={ () => handleSelect( item.id, item.disabled ) }
                                    className={ cn(
                                        "flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors",
                                        isActive
                                            ? "bg-secondary text-secondary-foreground"
                                            : "hover:bg-muted",
                                        item.disabled
                                            ? "cursor-not-allowed opacity-60"
                                            : "cursor-pointer"
                                    ) }
                                    disabled={ item.disabled }
                                >
                                    <span className="font-medium">{ item.label }</span>
                                    { item.disabled ? (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            Coming soon
                                        </span>
                                    ) : null }
                                </button>
                            );
                        } ) }
                    </nav>

                    <section className="flex-1 overflow-hidden rounded-lg border border-border/60 bg-background/80 p-6">
                        { activeItem ? (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold">{ activeItem.label }</h3>
                                    { activeItem.description ? (
                                        <p className="text-sm text-muted-foreground">
                                            { activeItem.description }
                                        </p>
                                    ) : null }
                                </div>
                                <div className="space-y-4">{ activeItem.content }</div>
                            </div>
                        ) : null }
                    </section>
                </div>
            ) }
            { footer === null ? null : (
                <div className="flex justify-end">
                    { footer ?? null }
                </div>
            ) }
        </div>
    );
}

export type { SettingsSurfaceProps };
