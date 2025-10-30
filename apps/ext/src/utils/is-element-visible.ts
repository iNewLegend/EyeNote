import {
    EYE_NOTE_ROOT_CONTAINER_ID,
    EYE_NOTE_SHADOW_CONTAINER_ID,
    EYE_NOTE_USERLAND_CONTAINER_ID,
    NOTES_PLUGIN_SELECTOR,
} from "@eye-note/definitions";

/**
 * Returns true when the given element is part of EyeNote-owned UI.
 *
 * EyeNote renders into dedicated containers (root/shadow/userland). Elements
 * inside those containers must be ignored by inspector, analyzer, and
 * visibility gating, otherwise markers/dialogs could react to our own DOM.
 */
export function isElementInsidePlugin ( element : Element ) : boolean {
    const ROOT_CONTAINER_SEL = `#${ EYE_NOTE_ROOT_CONTAINER_ID }`;
    const SHADOW_ROOT_SEL = `#${ EYE_NOTE_SHADOW_CONTAINER_ID }`;
    const USERLAND_ROOT_SEL = `#${ EYE_NOTE_USERLAND_CONTAINER_ID }`;

    return Boolean(
        element.closest( ROOT_CONTAINER_SEL ) ||
        element.closest( SHADOW_ROOT_SEL ) ||
        element.closest( USERLAND_ROOT_SEL ) ||
        element.closest( NOTES_PLUGIN_SELECTOR )
    );
}

/**
 * Lightweight viewport intersection check for a DOMRect.
 * An element intersects the viewport if any part of its rect is within the
 * current window bounds (no margins/buffers applied here).
 */
function intersectsViewport ( rect : DOMRect ) : boolean {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return rect.right > 0 && rect.bottom > 0 && rect.left < vw && rect.top < vh;
}

/**
 * Determines whether an element should be considered visible for marker
 * rendering:
 * - Connected to the document and not inside EyeNote-owned containers.
 * - Computed styles permit visibility (display != none, visibility not hidden
 *   or collapse, opacity > 0). Includes HTMLElement.hidden guard.
 * - Has non-zero geometry and intersects the viewport by at least 1px.
 */
export function isElementVisible ( element : Element ) : boolean {
    // Must be connected and not a plugin-owned node
    if ( !( element as HTMLElement ).isConnected ) {
        return false;
    }
    if ( isElementInsidePlugin( element ) ) {
        return false;
    }

    // Compute style-based visibility
    const style = window.getComputedStyle( element );
    if ( style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" ) {
        return false;
    }
    const opacity = parseFloat( style.opacity || "1" );
    if ( Number.isFinite( opacity ) && opacity <= 0 ) {
        return false;
    }

    // Hidden attribute for HTMLElements
    if ( element instanceof HTMLElement && element.hidden ) {
        return false;
    }

    // Geometry visibility
    const rect = element.getBoundingClientRect();
    if ( rect.width <= 0 || rect.height <= 0 ) {
        return false;
    }
    if ( !intersectsViewport( rect ) ) {
        return false;
    }

    return true;
}
