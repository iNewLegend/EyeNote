import React, { useState, useEffect } from "react";
import userlandStyles from "./userland-dom.css?inline";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../../core/theme/theme-provider";

export const UserlandDOM: React.FC = () => {
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    });
    const [isVisible, setIsVisible] = useState(false);

    // Update overlay position
    const updateOverlay = (element: Element | null) => {
        if (!element) {
            setIsVisible(false);
            return;
        }

        const rect = element.getBoundingClientRect();
        setOverlayStyle({
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
        setIsVisible(true);
    };

    useEffect(() => {
        // Expose updateOverlay to window
        (window as any).updateOverlay = updateOverlay;
    }, []);

    return (
        <ThemeProvider>
            <div id="eye-not-userland-dom">
                {/* Styles */}
                <style>{userlandStyles}</style>

                {/* Cursor Dot */}
                <CursorDotWrapper />

                {/* Highlight Overlay */}
                <HighlightOverlay style={overlayStyle} visible={isVisible} />

                {/* Interaction Blocker */}
                <div
                    id="eye-note-interaction-blocker"
                    className="fixed inset-0 pointer-events-none select-none cursor-none"
                    style={{ zIndex: 2147483644 }}
                />
            </div>
        </ThemeProvider>
    );
};
