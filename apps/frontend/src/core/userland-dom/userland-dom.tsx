import React, { useState, useEffect } from "react";
import userlandStyles from "./userland-dom.css?inline";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../../core/theme/theme-provider";
import { useInspectorStore } from "../../stores/use-inspector-store";
import { useHighlightStore } from "../../stores/highlight-store";

export const UserlandDOM: React.FC = () => {
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
    });
    const [isVisible, setIsVisible] = useState(false);

    // Subscribe to inspector mode changes
    const isInspectorMode = useInspectorStore((state) => state.isActive);
    const isAddingNote = useHighlightStore((state) => state.isAddingNote);

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

    // Handle inspector mode changes
    useEffect(() => {
        const interactionBlocker = document.getElementById("eye-note-interaction-blocker");
        if (!interactionBlocker) return;

        if (isInspectorMode || isAddingNote) {
            interactionBlocker.style.display = "block";
            if (!isAddingNote) {
                interactionBlocker.style.pointerEvents = "none";
            }
        } else {
            interactionBlocker.style.display = "none";
            setIsVisible(false); // Hide overlay when leaving inspector mode
        }
    }, [isInspectorMode, isAddingNote]);

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
                    style={{ zIndex: 2147483644, display: "none" }}
                />
            </div>
        </ThemeProvider>
    );
};
