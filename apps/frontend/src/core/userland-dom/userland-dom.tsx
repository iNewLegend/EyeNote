import React, { useState } from "react";
import userlandStyles from "./userland-dom.css?inline";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../../core/theme/theme-provider";
import { useThemeStore } from "../../stores/theme-store";
import { useModeStore } from "../../stores/use-mode-store";
import { useHighlightStore } from "../../stores/highlight-store";

export const UserlandDOM: React.FC = () => {
    const [overlayStyle, setOverlayStyle] = useState({
        display: "none",
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    });
    const [isVisible, setIsVisible] = useState(false);

    // Track mode changes
    const isInspectorMode = useModeStore((state) => state.isInspectorMode);
    const isAddingNote = useModeStore((state) => state.isAddingNote);

    // Update overlay position
    const updateOverlay = (element: Element | null) => {
        if (!element) {
            setOverlayStyle((prev) => ({ ...prev, display: "none" }));
            return;
        }

        const rect = element.getBoundingClientRect();
        setOverlayStyle({
            display: "block",
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    };

    // Expose updateOverlay to window
    React.useEffect(() => {
        (window as any).updateOverlay = updateOverlay;
        return () => {
            delete (window as any).updateOverlay;
        };
    }, []);

    // Handle visibility
    React.useEffect(() => {
        setIsVisible(isInspectorMode || isAddingNote);
    }, [isInspectorMode, isAddingNote]);

    if (!isVisible) return null;

    return (
        <ThemeProvider>
            <div id="eye-not-userland-dom">
                {/* Styles */}
                <style>{userlandStyles}</style>

                {/* Cursor Dot */}
                <CursorDotWrapper />

                {/* Highlight Overlay */}
                <HighlightOverlay style={overlayStyle} visible={isVisible} />
            </div>
        </ThemeProvider>
    );
};
