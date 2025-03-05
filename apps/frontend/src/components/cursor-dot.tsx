import React, { useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { useCursorStore } from "../stores/use-cursor-store";

interface CursorDotProps {
    /**
     * Primary color for the cursor dot
     */
    color?: string;
    /**
     * Whether the cursor dot is visible
     */
    visible: boolean;
}

/**
 * CursorDot component that follows the mouse cursor
 */
export const CursorDot: React.FC<CursorDotProps> = ({ color = "#7c3aed", visible }) => {
    const cursorDotRef = useRef<HTMLDivElement | null>(null);
    const { position } = useCursorStore();

    // Handle visibility changes and cleanup
    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        if (!cursorDot) return;

        if (!visible) {
            cursorDot.style.opacity = "0";
            cursorDot.style.visibility = "hidden";
            return;
        }

        // Apply styles when visible
        cursorDot.style.backgroundColor = color;
        cursorDot.style.borderRadius = "9999px";
        cursorDot.style.position = "fixed";
        cursorDot.style.pointerEvents = "none";
        cursorDot.style.zIndex = "2147483645";
        cursorDot.style.transform = "translate(-50%, -50%)";
        cursorDot.style.opacity = "1";
        cursorDot.style.visibility = "visible";
        cursorDot.style.filter = "drop-shadow(0 0 4px rgba(72, 4, 173, 0.3))";
        cursorDot.style.transition = "opacity 0.2s ease-out, visibility 0.2s ease-out";

        // Update position
        cursorDot.style.left = `${position.x}px`;
        cursorDot.style.top = `${position.y}px`;
    }, [color, visible, position]);

    return (
        <>
            {/* Main cursor dot */}
            <div
                ref={cursorDotRef}
                className={cn(
                    // Layout
                    "fixed w-[0.5rem] h-[0.5rem]",
                    // Appearance
                    "rounded-full",
                    // Positioning and interactions
                    "pointer-events-none -translate-x-1/2 -translate-y-1/2",
                    // Z-index
                    "z-[2147483645]",
                    // Transitions
                    "transition-[opacity,visibility] duration-200",
                    // Effects
                    "drop-shadow-[0_0_4px_rgba(72,4,173,0.3)]"
                )}
                style={
                    {
                        backgroundColor: color,
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "9999px",
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        opacity: visible ? "1" : "0",
                        visibility: visible ? "visible" : "hidden",
                        "--pulse-color": color,
                    } as React.CSSProperties
                }
            >
                {/* Pulse effect - larger circle that scales and fades out */}
                {visible && (
                    <div
                        className="pulse-effect"
                        style={{
                            position: "absolute",
                            width: "120%",
                            height: "120%",
                            left: "-10%",
                            top: "-10%",
                            borderRadius: "9999px",
                            backgroundColor: "var(--pulse-color)",
                            opacity: "0.8",
                            pointerEvents: "none",
                            animation: "cursor-ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite",
                            transformOrigin: "center",
                        }}
                    />
                )}
            </div>
            {/* Animation keyframes for the pulse effect */}
            <style>
                {`
                @keyframes cursor-ping {
                    0% {
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
                `}
            </style>
        </>
    );
};

export default CursorDot;
