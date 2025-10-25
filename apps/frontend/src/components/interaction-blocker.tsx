import { cn } from "../lib/utils";

interface InteractionBlockerProps {
    isVisible : boolean;
    className ?: string;
}

export function InteractionBlocker ( { isVisible, className } : InteractionBlockerProps ) {
    if ( !isVisible ) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 w-full h-full pointer-events-none z-[2147483646]",
                className
            )}
            data-testid="eye-note-interaction-blocker"
        />
    );
} 
