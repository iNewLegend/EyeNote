import type { GroupsStorageAdapter } from "@eye-note/groups";

const ACTIVE_GROUPS_KEY = "activeGroups";

function ensureStringArray ( value : unknown ) : string[] {
    if ( !Array.isArray( value ) ) {
        return [];
    }

    return value.filter( ( entry ) => typeof entry === "string" ) as string[];
}

export const chromeGroupsStorageAdapter : GroupsStorageAdapter = {
    async getActiveGroupIds () : Promise<string[]> {
        if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
            return [];
        }

        return new Promise<string[]>( ( resolve ) => {
            chrome.storage.local.get( [ ACTIVE_GROUPS_KEY ], ( result ) => {
                try {
                    resolve( ensureStringArray( result[ ACTIVE_GROUPS_KEY ] ) );
                } catch {
                    resolve( [] );
                }
            } );
        } );
    },
    async setActiveGroupIds ( groupIds : string[] ) : Promise<void> {
        if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
            return;
        }

        await new Promise<void>( ( resolve ) => {
            chrome.storage.local.set( { [ ACTIVE_GROUPS_KEY ]: groupIds }, () => resolve() );
        } );
    },
    subscribeToActiveGroupIds ( callback : ( next : string[] ) => void ) {
        if ( typeof chrome === "undefined" || !chrome.storage?.onChanged ) {
            return () => {};
        }

        const handler : Parameters<typeof chrome.storage.onChanged.addListener>[ 0 ] = ( changes, areaName ) => {
            if ( areaName !== "local" ) {
                return;
            }

            if ( !( ACTIVE_GROUPS_KEY in changes ) ) {
                return;
            }

            const change = changes[ ACTIVE_GROUPS_KEY ];
            callback( ensureStringArray( change.newValue ) );
        };

        chrome.storage.onChanged.addListener( handler );

        return () => {
            chrome.storage.onChanged.removeListener( handler );
        };
    },
};
