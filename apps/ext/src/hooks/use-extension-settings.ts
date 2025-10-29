import { useCallback, useEffect, useState } from "react";

export interface ExtensionSettings {
    enabled : boolean;
    notificationSound : boolean;
    showUnreadBadge : boolean;
}

const defaultSettings : ExtensionSettings = {
    enabled: true,
    notificationSound: true,
    showUnreadBadge: true,
};

const mergeSettings = ( incoming ?: Partial<ExtensionSettings> ) : ExtensionSettings => ( {
    ...defaultSettings,
    ...incoming,
} );

const persistSettings = ( settings : ExtensionSettings ) => {
    if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
        return;
    }

    chrome.storage.local.set( { settings } );
};

export const useExtensionSettings = () => {
    const [ settings, setSettings ] = useState<ExtensionSettings>( defaultSettings );

    useEffect( () => {
        if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
            return;
        }

        chrome.storage.local.get( "settings", ( result ) => {
            const stored = ( result as { settings ?: Partial<ExtensionSettings> } ).settings;
            if ( stored ) {
                setSettings( mergeSettings( stored ) );
            }
        } );

        const handleStorageChange : Parameters<typeof chrome.storage.onChanged.addListener>[ 0 ] = (
            changes,
            areaName
        ) => {
            if ( areaName !== "local" ) {
                return;
            }

            const change = changes.settings;
            if ( !change ) {
                return;
            }

            const nextValue = mergeSettings( change.newValue as Partial<ExtensionSettings> | undefined );
            setSettings( nextValue );
        };

        chrome.storage.onChanged.addListener( handleStorageChange );
        return () => {
            chrome.storage.onChanged.removeListener( handleStorageChange );
        };
    }, [] );

    const updateSettings = useCallback( ( updater : ( current : ExtensionSettings ) => ExtensionSettings ) => {
        setSettings( ( current ) => {
            const next = updater( current );
            persistSettings( next );
            return next;
        } );
    }, [] );

    const setSetting = useCallback(
        ( key : keyof ExtensionSettings, value : boolean ) => {
            updateSettings( ( current ) => ( {
                ...current,
                [ key ]: value,
            } ) );
        },
        [ updateSettings ]
    );

    return {
        settings,
        setSetting,
    };
};

