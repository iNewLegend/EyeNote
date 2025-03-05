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

    useEffect(() => {
        const cursorDot = cursorDotRef.current;
        if (!cursorDot) return;

        // Only update position and color dynamically
        cursorDot.style.left = `${position.x}px`;
        cursorDot.style.top = `${position.y}px`;
    }, [position]);

    return (
        <>
            <div
                ref={cursorDotRef}
                className={cn(
                    "fixed w-2 h-2",
                    "rounded-full",
                    "pointer-events-none -translate-x-1/2 -translate-y-1/2",
                    "z-[2147483645]",
                    "transition-[opacity,visibility] duration-200 ease-out",
                    "drop-shadow-[0_0_4px_rgba(72,4,173,0.3)]",
                    visible ? "opacity-100 visible" : "opacity-0 invisible"
                )}
                style={
                    {
                        backgroundColor: color,
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        "--pulse-color": color,
                    } as React.CSSProperties
                }
            >
                {visible && (
                    <div
                        className={cn(
                            "absolute w-[120%] h-[120%] -left-[10%] -top-[10%]",
                            "rounded-full opacity-80 pointer-events-none",
                            "animate-cursor"
                        )}
                        style={{
                            backgroundColor: "var(--pulse-color)",
                        }}
                    />
                )}
            </div>
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
