import { create } from "zustand";

export const enum AppMode {
    NEUTRAL = 0, // 0000
    CONNECTED = 1 << 0,
    DEBUG_MODE = 1 << 1,
    INSPECTOR_MODE = 1 << 2,
    NOTES_MODE = 1 << 3,
    // We can easily add more modes in the future
    // SOME_OTHER_MODE = 1 << 3,   // 1000
    // ANOTHER_MODE = 1 << 4,      // 10000
}

interface ModeStore {
    modes : number;
    setMode : ( mode : AppMode ) => void;
    addMode : ( mode : AppMode ) => void;
    removeMode : ( mode : AppMode ) => void;
    toggleMode : ( mode : AppMode ) => void;
    clearModes : () => void;
    isMode : ( mode : AppMode ) => boolean;
    isOnlyMode : ( mode : AppMode ) => boolean;
    isModes : ( modes : AppMode[] ) => boolean;
    hasAnyMode : ( modes : AppMode[] ) => boolean;
}

// Helper function to update DOM classes based on modes
const updateDOMClasses = ( modes : number ) => {
    document.body.classList.remove( "inspector-mode", "adding-note" );
    document.body.style.cursor = "";

    if ( modes & AppMode.INSPECTOR_MODE ) {
        document.body.classList.add( "inspector-mode" );
        // Only set cursor to none if we're not in notes mode
        if ( !( modes & AppMode.NOTES_MODE ) ) {
            document.body.style.cursor = "none";
        }
    }

    if ( modes & AppMode.NOTES_MODE ) {
        document.body.classList.add( "adding-note" );
    }
};

// Helper function to log mode changes when in debug mode
const logModeChange = ( oldModes : number, newModes : number ) => {
    if ( process.env.NODE_ENV === "development" ) {
        if ( newModes & AppMode.DEBUG_MODE ) {
            const getActiveModesNames = ( modes : number ) => {
                const activeNames : string[] = [];
                if ( modes & AppMode.CONNECTED ) activeNames.push( "CONNECTED" );
                if ( modes & AppMode.DEBUG_MODE ) activeNames.push( "DEBUG_MODE" );
                if ( modes & AppMode.INSPECTOR_MODE ) activeNames.push( "INSPECTOR_MODE" );
                if ( modes & AppMode.NOTES_MODE ) activeNames.push( "NOTES_MODE" );
                return activeNames.length ? activeNames.join( " | " ) : "NEUTRAL";
            };

            console.log(
                `[EyeNote][Mode] Mode Change: ${ getActiveModesNames( oldModes ) } -> ${ getActiveModesNames( newModes ) }`
            );
        }
    }
};

export const useModeStore = create<ModeStore>( ( set, get ) => {
    return {
        modes: AppMode.DEBUG_MODE,

    setMode: ( mode : AppMode ) => {
        const oldModes = get().modes;
        set( { modes: mode } );
        updateDOMClasses( mode );
        logModeChange( oldModes, mode );
    },

    addMode: ( mode : AppMode ) => {
        const oldModes = get().modes;
        const newModes = oldModes | mode;
        set( { modes: newModes } );
        updateDOMClasses( newModes );
        logModeChange( oldModes, newModes );
    },

    removeMode: ( mode : AppMode ) => {
        const oldModes = get().modes;
        const newModes = oldModes & ~mode;
        set( { modes: newModes } );
        updateDOMClasses( newModes );
        logModeChange( oldModes, newModes );
    },

    toggleMode: ( mode : AppMode ) => {
        const oldModes = get().modes;
        const newModes = oldModes ^ mode;
        set( { modes: newModes } );
        updateDOMClasses( newModes );
        logModeChange( oldModes, newModes );
    },

    clearModes: () => {
        const oldModes = get().modes;
        set( { modes: AppMode.NEUTRAL } );
        updateDOMClasses( AppMode.NEUTRAL );
        logModeChange( oldModes, AppMode.NEUTRAL );
    },

    // Check if a specific mode is active (can be along with others)
    isMode: ( mode : AppMode ) => {
        return ( get().modes & mode ) === mode;
    },

    // Check if ONLY this mode is active (no other modes)
    isOnlyMode: ( mode : AppMode ) => {
        return get().modes === mode;
    },

    // Check if ALL specified modes are active (can have additional modes)
    isModes: ( modes : AppMode[] ) => {
        const combinedModes = modes.reduce( ( acc, mode ) => acc | mode, 0 );
        return ( get().modes & combinedModes ) === combinedModes;
    },

    // Check if ANY of the specified modes are active
    hasAnyMode: ( modes : AppMode[] ) => {
        const combinedModes = modes.reduce( ( acc, mode ) => acc | mode, 0 );
        return ( get().modes & combinedModes ) !== 0;
    },
    };
} );
