import { cn, Z_INDEX } from "@eye-note/ui";

interface InteractionBlockerProps {
    isVisible : boolean;
    className ?: string;
}

export function InteractionBlocker ( { isVisible, className } : InteractionBlockerProps ) {
    if ( !isVisible ) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 w-full h-full pointer-events-none",
                className
            )}
            style={{ zIndex: Z_INDEX.interactionShield }}
            data-testid="eye-note-interaction-blocker"
        />
    );
}
