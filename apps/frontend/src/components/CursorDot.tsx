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
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    // Apply base styles to the cursor dot
    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        if (!cursorDot) return;

        // Apply styles directly to match the tailwind classes
        cursorDot.style.backgroundColor = color;
        cursorDot.style.borderRadius = "9999px";
        cursorDot.style.position = "fixed";
        cursorDot.style.pointerEvents = "none";
        cursorDot.style.zIndex = "2147483645";
        cursorDot.style.transform = "translate(-50%, -50%)";
        cursorDot.style.opacity = visible ? "1" : "0";
        cursorDot.style.filter = "drop-shadow(0 0 4px rgba(72, 4, 173, 0.3))";
    }, [color, visible]);

    // Update cursor position
    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        if (!cursorDot) return;

        cursorDot.style.left = `${position.x}px`;
        cursorDot.style.top = `${position.y}px`;
    }, [position]);

    // Track mouse movement
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            requestAnimationFrame(() => {
                setPosition({ x: e.clientX, y: e.clientY });
            });
        };

        document.addEventListener("mousemove", handleMouseMove);
        return () => document.removeEventListener("mousemove", handleMouseMove);
    }, []);

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
                    "transition-opacity duration-300 ease-out transition-transform duration-200",
                    // Visibility
                    visible ? "opacity-100" : "opacity-0",
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
                        "--pulse-color": color, // Pass color to pulse effect via CSS variable
                    } as React.CSSProperties
                }
            >
                {/* Pulse effect - larger circle that scales and fades out */}
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
