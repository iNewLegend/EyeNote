import React from "react";
import { createRoot } from "react-dom/client";
import { ShadowDOM } from "../shadow-dom/shadow-dom";
import { UserlandDOM } from "../userland-dom/userland-dom";
import { useModeStore, AppMode } from "../../stores/use-mode-store";
import { useHighlightStore } from "../../stores/highlight-store";
import shadowDOMStyles from "../shadow-dom/shadow-dom.css?inline";

// Constants for DOM IDs
const DOM_IDS = {
    SHADOW_CONTAINER: "eye-not-shadow-dom",
    SHADOW_CONTENT: "eye-not-shadow-content",
    SHADOW_STYLES: "eye-not-shadow-dom-styles",
    USERLAND_CONTAINER: "eye-not-userland-dom",
} as const;

function initializeDOMContainers() {
    const shadowContainer = document.createElement("div");
    shadowContainer.id = DOM_IDS.SHADOW_CONTAINER;

    const userlandContainer = document.createElement("div");
    userlandContainer.id = DOM_IDS.USERLAND_CONTAINER;

    return { shadowContainer, userlandContainer };
}

function initializeShadowDOM(container: HTMLElement) {
    const shadowRoot = container.attachShadow({ mode: "open" });

    const shadowStyles = document.createElement("style");
    shadowStyles.id = DOM_IDS.SHADOW_STYLES;
    shadowStyles.textContent = shadowDOMStyles;
    shadowRoot.appendChild(shadowStyles);

    const contentContainer = document.createElement("div");
    contentContainer.id = DOM_IDS.SHADOW_CONTENT;
    shadowRoot.appendChild(contentContainer);

    return { shadowRoot, contentContainer };
}

function setupEventListeners() {
    // Track state
    let currentInspectedElement: HTMLElement | null = null;
    let selectedElement: HTMLElement | null = null;
    let isShiftPressed = false; // Add shift key tracking

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
        const x = e.clientX;
        const y = e.clientY;

        const modeStore = useModeStore.getState();
        if (!modeStore.isMode(AppMode.INSPECTOR_MODE) || modeStore.isMode(AppMode.NOTES_MODE)) {
            if (currentInspectedElement) {
                currentInspectedElement.style.cursor = "";
                currentInspectedElement = null;

                // Clean up highlight store state when not in inspector mode
                const highlightStore = useHighlightStore.getState();
                highlightStore.setHoveredElement(null);
                highlightStore.clearAllHighlights();

                if (!selectedElement) {
                    (window as any).updateOverlay(null);
                }
            }
            return;
        }

        const element = document.elementFromPoint(x, y);

        if (
            !element ||
            element === currentInspectedElement ||
            element.closest(`#${DOM_IDS.SHADOW_CONTAINER}`) ||
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
            currentInspectedElement = element;

            // Add highlight to current element
            const highlightStore = useHighlightStore.getState();
            highlightStore.addHighlight(element);
            (window as any).updateOverlay(element);
        }
    };

    // Handle shift key events
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            isShiftPressed = true; // Track shift key state
            // Update mode store state
            useModeStore.getState().addMode(AppMode.INSPECTOR_MODE);

            // Reset state if not in notes mode
            if (!useModeStore.getState().isMode(AppMode.NOTES_MODE)) {
                currentInspectedElement = null;
                selectedElement = null;
            }

            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            isShiftPressed = false; // Track shift key state
            if (!useModeStore.getState().isMode(AppMode.NOTES_MODE)) {
                // Update mode store state
                useModeStore.getState().removeMode(AppMode.INSPECTOR_MODE);

                // Clean up any inspected element
                if (currentInspectedElement) {
                    currentInspectedElement.style.cursor = "";
                    currentInspectedElement = null;
                }

                // Clear the overlay
                (window as any).updateOverlay(null);
            }
        }
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Custom events for note creation
    window.addEventListener("eye-note:element-selected", ((e: CustomEvent) => {
        const element = e.detail.element;
        if (element instanceof HTMLElement) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            selectedElement = element;

            // Update store states for note mode
            const modeStore = useModeStore.getState();
            modeStore.addMode(AppMode.NOTES_MODE);
            const highlightStore = useHighlightStore.getState();
            highlightStore.setSelectedElement(element);

            (window as any).updateOverlay(element);

            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        }
    }) as EventListener);

    window.addEventListener("eye-note:note-dismissed", (() => {
        const modeStore = useModeStore.getState();
        modeStore.removeMode(AppMode.NOTES_MODE);

        // Update inspector mode based on shift key state
        if (!isShiftPressed) {
            modeStore.removeMode(AppMode.INSPECTOR_MODE);
        }

        const highlightStore = useHighlightStore.getState();
        highlightStore.setSelectedElement(null);
        highlightStore.setHoveredElement(null);
        highlightStore.clearAllHighlights();

        // Then update local state
        selectedElement = null;

        // Clean up any inspected element
        if (currentInspectedElement) {
            currentInspectedElement.style.cursor = "";
            currentInspectedElement = null;
        }

        // Clear the overlay
        (window as any).updateOverlay(null);
    }) as EventListener);
}

function initializeApp() {
    // Check if already initialized
    if (document.getElementById(DOM_IDS.SHADOW_CONTAINER)) {
        return;
    }

    // Initialize containers
    const { shadowContainer, userlandContainer } = initializeDOMContainers();

    // Setup shadow DOM
    const { contentContainer } = initializeShadowDOM(shadowContainer);

    // Append containers to body
    document.body.appendChild(shadowContainer);
    document.body.appendChild(userlandContainer);

    // Setup event listeners
    setupEventListeners();

    // Render React components
    const root = createRoot(contentContainer);
    const userlandRoot = createRoot(userlandContainer);

    root.render(
        <React.StrictMode>
            <ShadowDOM />
        </React.StrictMode>
    );

    userlandRoot.render(
        <React.StrictMode>
            <UserlandDOM />
        </React.StrictMode>
    );

    return { root, userlandRoot };
}

// Initialize the application
initializeApp();
