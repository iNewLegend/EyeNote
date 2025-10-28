import { useCallback, useEffect, useState } from "react";

export type DashboardSettings = {
    enabled : boolean;
    notificationSound : boolean;
    showUnreadBadge : boolean;
};

const STORAGE_KEY = "eye-note-dashboard-settings";

const defaultSettings : DashboardSettings = {
    enabled: true,
    notificationSound: true,
    showUnreadBadge: true,
};

const parseStoredSettings = ( value : string | null ) : DashboardSettings => {
    if ( !value ) {
        return defaultSettings;
    }

    try {
        const parsed = JSON.parse( value ) as Partial<DashboardSettings>;
        return {
            ...defaultSettings,
            ...parsed,
        };
    } catch ( error ) {
        console.warn( "[EyeNote] Failed to parse stored settings", error );
        return defaultSettings;
    }
};

export const useDashboardSettings = () => {
    const [ settings, setSettings ] = useState<DashboardSettings>( () => {
        if ( typeof window === "undefined" || typeof window.localStorage === "undefined" ) {
            return defaultSettings;
        }

        return parseStoredSettings( window.localStorage.getItem( STORAGE_KEY ) );
    } );

    useEffect( () => {
        if ( typeof window === "undefined" || typeof window.localStorage === "undefined" ) {
            return;
        }

        window.localStorage.setItem( STORAGE_KEY, JSON.stringify( settings ) );
    }, [ settings ] );

    const setSetting = useCallback( ( key : keyof DashboardSettings, value : boolean ) => {
        setSettings( ( current ) => ( {
            ...current,
            [ key ]: value,
        } ) );
    }, [] );

    const resetSettings = useCallback( () => {
        setSettings( defaultSettings );
    }, [] );

    return {
        settings,
        setSetting,
        resetSettings,
    };
};
