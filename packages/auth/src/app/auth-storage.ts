import type { AuthSession } from "../shared";

const STORAGE_KEY = "eye-note-app-auth";

const isStorageAvailable = () => {
    try {
        if ( typeof window === "undefined" || !window.localStorage ) {
            return false;
        }
        const testKey = "__storage_test__";
        window.localStorage.setItem( testKey, "1" );
        window.localStorage.removeItem( testKey );
        return true;
    } catch {
        return false;
    }
};

export function loadAuthSession () : AuthSession | null {
    if ( !isStorageAvailable() ) {
        return null;
    }

    const raw = window.localStorage.getItem( STORAGE_KEY );
    if ( !raw ) {
        return null;
    }

    try {
        const parsed = JSON.parse( raw ) as Partial<AuthSession>;
        if ( !parsed.authToken || !parsed.authAccessToken || !parsed.authTokenExpiresAt || !parsed.user ) {
            return null;
        }

        if ( Number.isFinite( parsed.authTokenExpiresAt ) && parsed.authTokenExpiresAt < Date.now() ) {
            clearAuthSession();
            return null;
        }

        return parsed as AuthSession;
    } catch {
        clearAuthSession();
        return null;
    }
}

export function storeAuthSession ( session : AuthSession ) {
    if ( !isStorageAvailable() ) {
        return;
    }

    window.localStorage.setItem( STORAGE_KEY, JSON.stringify( session ) );
}

export function clearAuthSession () {
    if ( !isStorageAvailable() ) {
        return;
    }

    window.localStorage.removeItem( STORAGE_KEY );
}
