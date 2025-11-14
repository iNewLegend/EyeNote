import type { GroupsStorageAdapter } from "@eye-note/groups";

const STORAGE_KEY = "eye-note-active-groups";

function readStoredIds () : string[] {
    if ( typeof window === "undefined" ) {
        return [];
    }

    try {
        const raw = window.localStorage.getItem( STORAGE_KEY );
        if ( !raw ) {
            return [];
        }
        const parsed = JSON.parse( raw );
        if ( !Array.isArray( parsed ) ) {
            return [];
        }
        return parsed.filter( ( entry ) => typeof entry === "string" );
    } catch ( error ) {
        console.warn( "[EyeNote] Failed to read stored active group IDs", error );
        return [];
    }
}

function writeStoredIds ( ids : string[] ) {
    if ( typeof window === "undefined" ) {
        return;
    }

    try {
        window.localStorage.setItem( STORAGE_KEY, JSON.stringify( ids ) );
    } catch ( error ) {
        console.warn( "[EyeNote] Failed to persist active group IDs", error );
    }
}

export const localGroupsStorageAdapter : GroupsStorageAdapter = {
    async getActiveGroupIds () {
        return readStoredIds();
    },
    async setActiveGroupIds ( ids ) {
        writeStoredIds( ids );
    },
    subscribeToActiveGroupIds ( callback ) {
        if ( typeof window === "undefined" ) {
            return () => {};
        }

        const handler = ( event : StorageEvent ) => {
            if ( event.key !== STORAGE_KEY ) {
                return;
            }

            callback( readStoredIds() );
        };

        window.addEventListener( "storage", handler );
        return () => {
            window.removeEventListener( "storage", handler );
        };
    },
};
