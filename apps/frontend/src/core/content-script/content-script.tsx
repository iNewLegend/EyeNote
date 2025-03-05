import React from "react";
import { createRoot } from "react-dom/client";
import { ShadowDOM } from "../shadow-dom/shadow-dom";
import { UserlandDOM } from "../userland-dom/userland-dom";
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
