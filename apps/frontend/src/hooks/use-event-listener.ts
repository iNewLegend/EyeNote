import { useEffect } from "react";

type EventMap = WindowEventMap & DocumentEventMap & ElementEventMap;

/**
 * A custom hook for managing event listeners with proper cleanup
 * @param eventName The name of the event to listen for
 * @param handler The event handler function
 * @param element The element to attach the listener to (defaults to document)
 * @param options Event listener options
 */
export function useEventListener<K extends keyof EventMap> (
    eventName : K,
    handler : ( event : EventMap[K] ) => void,
    element : Document | Window = document,
    options ?: boolean | AddEventListenerOptions
) {
    useEffect( () => {
        // Make sure element supports addEventListener
        const isSupported = element && element.addEventListener;
        if ( !isSupported ) return;

        // Add event listener
        element.addEventListener( eventName, handler as EventListener, options );

        // Cleanup
        return () => {
            element.removeEventListener( eventName, handler as EventListener, options );
        };
    }, [ eventName, element, handler, options ] );
} 