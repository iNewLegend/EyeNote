import React, { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface CursorDotProps {
    /**
     * Whether the cursor dot is visible
     */
    visible?: boolean;
    /**
     * Primary color for the cursor dot
     */
    color?: string;
}

/**
 * CursorDot component that follows the mouse cursor
 * Used in inspector mode to highlight the cursor position
 */
export const CursorDot: React.FC<CursorDotProps> = ({ visible = false, color = "#7c3aed" }) => {
    const cursorDotRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        if (!cursorDot) return;

        // Apply styles directly to match the tailwind classes
        cursorDot.style.width = "0.5rem"; // w-2
        cursorDot.style.height = "0.5rem"; // h-2
        cursorDot.style.backgroundColor = color; // bg-primary
        cursorDot.style.borderRadius = "9999px"; // rounded-full
        cursorDot.style.position = "fixed"; // fixed
        cursorDot.style.pointerEvents = "none"; // pointer-events-none
        cursorDot.style.zIndex = "2147483645"; // z-highlight-element
        cursorDot.style.transform = "translate(-50%, -50%)"; // -translate-x-1/2 -translate-y-1/2
        cursorDot.style.opacity = visible ? "1" : "0"; // opacity-0 (controlled by visible prop)
        cursorDot.style.transition =
            "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        cursorDot.style.filter = "drop-shadow(0 0 4px rgba(72, 4, 173, 0.3))";

        // Create the pulse effect (::after element)
        const pulseEffect = document.createElement("div");
        pulseEffect.style.position = "absolute";
        pulseEffect.style.top = "50%";
        pulseEffect.style.left = "50%";
        pulseEffect.style.transform = "translate(-50%, -50%)";
        pulseEffect.style.width = "120%";
        pulseEffect.style.height = "120%";
        pulseEffect.style.borderRadius = "9999px";
        pulseEffect.style.backgroundColor = color;
        pulseEffect.style.pointerEvents = "none";

        // Add animation
        pulseEffect.style.animation = "cursor-ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite";

        // Add keyframes for the animation if they don't exist
        if (!document.getElementById("cursor-ping-keyframes")) {
            const keyframes = document.createElement("style");
            keyframes.id = "cursor-ping-keyframes";
            keyframes.textContent = `
                @keyframes cursor-ping {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.8;
                    }
                    70%, 100% {
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(keyframes);
        }

        // Append the pulse effect to the cursor dot
        cursorDot.appendChild(pulseEffect);

        // Handle mouse movement
        const handleMouseMove = (e: MouseEvent) => {
            requestAnimationFrame(() => {
                if (cursorDot) {
                    cursorDot.style.left = `${e.clientX}px`;
                    cursorDot.style.top = `${e.clientY}px`;
                }
            });
        };

        // Add event listener
        document.addEventListener("mousemove", handleMouseMove);

        // Clean up
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            if (document.getElementById("cursor-ping-keyframes")) {
                document.getElementById("cursor-ping-keyframes")?.remove();
            }
        };
    }, [color, visible]);

    return (
        <div
            ref={cursorDotRef}
            className={cn(
                // Layout
                "fixed w-2 h-2",
                // Appearance
                "rounded-full",
                // Positioning and interactions
                "pointer-events-none -translate-x-1/2 -translate-y-1/2",
                // Z-index
                "z-[2147483645]",
                // Transitions
                "transition-all duration-300 ease-in-out",
                // Visibility
                visible ? "opacity-100" : "opacity-0",
                // Effects
                "drop-shadow-[0_0_4px_rgba(72,4,173,0.3)]"
            )}
            style={{ backgroundColor: color }}
        />
    );
};

export default CursorDot;
