import React, { useEffect, useRef } from "react";

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

        // Set initial styles
        cursorDot.style.width = "8px";
        cursorDot.style.height = "8px";
        cursorDot.style.backgroundColor = color;
        cursorDot.style.borderRadius = "9999px";
        cursorDot.style.position = "fixed";
        cursorDot.style.pointerEvents = "none";
        cursorDot.style.zIndex = "2147483645";
        cursorDot.style.transform = "translate(-50%, -50%)";
        cursorDot.style.opacity = visible ? "1" : "0";
        cursorDot.style.transition =
            "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        cursorDot.style.filter = "drop-shadow(0 0 4px rgba(72, 4, 173, 0.3))";

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
        };
    }, [color, visible]);

    return <div ref={cursorDotRef} className="cursor-dot" />;
};

export default CursorDot;
