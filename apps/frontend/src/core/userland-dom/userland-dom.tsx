import React, { useState, useEffect } from "react";
import userlandStyles from "./userland-dom.css?inline";
import { CursorDotWrapper } from "../../components/cursor-dot-wrapper";
import { HighlightOverlay } from "../../components/highlight-overlay";
import { ThemeProvider } from "../../core/theme/theme-provider";
import { useThemeStore } from "../../stores/theme-store";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
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
    const [currentInspectedElement, setCurrentInspectedElement] = useState<HTMLElement | null>(
        null
    );

    // Track mode changes using the new system
    const hasActiveMode = useModeStore((state) =>
        state.hasAnyMode([AppMode.INSPECTOR_MODE, AppMode.NOTES_MODE])
    );

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

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
        const modeStore = useModeStore.getState();
        if (!modeStore.isMode(AppMode.INSPECTOR_MODE) || modeStore.isMode(AppMode.NOTES_MODE)) {
            if (currentInspectedElement) {
                currentInspectedElement.style.cursor = "";
                setCurrentInspectedElement(null);

                // Clean up highlight store state when not in inspector mode
                const highlightStore = useHighlightStore.getState();
                highlightStore.setHoveredElement(null);
                highlightStore.clearAllHighlights();

                if (!currentInspectedElement) {
                    updateOverlay(null);
                }
            }
            return;
        }

        const element = document.elementFromPoint(e.clientX, e.clientY);

        if (
            !element ||
            element === currentInspectedElement ||
            element.closest(`#eye-not-shadow-dom`) ||
            element.closest(".notes-plugin")
        ) {
            return;
        }

        if (element instanceof HTMLElement) {
            if (currentInspectedElement && currentInspectedElement !== element) {
                currentInspectedElement.style.cursor = "";
                // Clean up previous element highlight
                const highlightStore = useHighlightStore.getState();
                highlightStore.removeHighlight(currentInspectedElement);
            }

            element.style.cursor = "none";
            setCurrentInspectedElement(element);

            // Add highlight to current element
            const highlightStore = useHighlightStore.getState();
            highlightStore.addHighlight(element);
            updateOverlay(element);
        }
    };

    // Expose updateOverlay to window
    useEffect(() => {
        (window as any).updateOverlay = updateOverlay;

        // Add mouse move listener
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            delete (window as any).updateOverlay;
            document.removeEventListener("mousemove", handleMouseMove);

            // Clean up any remaining cursor styles
            if (currentInspectedElement) {
                currentInspectedElement.style.cursor = "";
            }
        };
    }, [currentInspectedElement]);

    // Handle visibility
    useEffect(() => {
        setIsVisible(hasActiveMode);
    }, [hasActiveMode]);

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
