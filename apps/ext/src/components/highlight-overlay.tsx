import React from "react";

interface HighlightOverlayProps {
    id ?: string;
    style ?: React.CSSProperties;
    className ?: string;
    visible ?: boolean;
}

export const HighlightOverlay : React.FC<HighlightOverlayProps> = ( {
    id = "eye-note-highlight-overlay",
    style,
    className,
    visible = true,
} ) => {
    const baseStyle : React.CSSProperties = {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "var(--z-index-highlight-overlay, 2147483645)",
        border: "2px solid #7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.35)",
        transition: "all 0.2s ease",
        boxSizing: "border-box",
        display: visible ? "block" : "none",
        ...style,
    };

    return <div id={id} style={baseStyle} className={className} />;
};
