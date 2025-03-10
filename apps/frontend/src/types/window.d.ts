declare global {
    interface Window {
        updateOverlay ?: ( element : Element | null ) => void;
    }
}

export {}; 