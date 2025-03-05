import React from "react";
import { createRoot } from "react-dom/client";
import { ShadowDOM } from "../shadow-dom/shadow-dom";
import { UserlandDOM } from "../userland-dom/userland-dom";
import { useInspectorStore } from "../../stores/use-inspector-store";
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
    let isAddingNote = false;

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
        const x = e.clientX;
        const y = e.clientY;

        if (!document.body.classList.contains("inspector-mode")) {
            if (currentInspectedElement && !isAddingNote) {
                currentInspectedElement.style.cursor = "";
                currentInspectedElement = null;

                if (!isAddingNote || !selectedElement) {
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
            }

            element.style.cursor = "none";
            currentInspectedElement = element;

            if (!isAddingNote || element === selectedElement) {
                (window as any).updateOverlay(element);
            }
        }
    };

    // Handle shift key events
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            if (!isAddingNote) {
                currentInspectedElement = null;
                selectedElement = null;
            }

            document.body.classList.add("inspector-mode");
            useInspectorStore.getState().setIsActive(true);

            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            if (!isAddingNote) {
                document.body.classList.remove("inspector-mode");
                useInspectorStore.getState().setIsActive(false);

                if (currentInspectedElement) {
                    currentInspectedElement.style.cursor = "";
                    currentInspectedElement = null;
                    (window as any).updateOverlay(null);
                }
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
            isAddingNote = true;
            (window as any).updateOverlay(element);
            document.body.classList.add("adding-note");

            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
        }
    }) as EventListener);

    window.addEventListener("eye-note:note-dismissed", (() => {
        isAddingNote = false;
        selectedElement = null;
        document.body.classList.remove("adding-note");

        if (!document.body.classList.contains("inspector-mode") || !currentInspectedElement) {
            document.body.classList.remove("inspector-mode");
            document.body.style.cursor = "";
            useInspectorStore.getState().setIsActive(false);
            (window as any).updateOverlay(null);
        }
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
