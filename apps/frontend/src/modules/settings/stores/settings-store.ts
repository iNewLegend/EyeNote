import { create } from "zustand";

export interface ExtensionSettings {
    enabled : boolean;
    notificationSound : boolean;
    showUnreadBadge : boolean;
}

const DEFAULT_SETTINGS : ExtensionSettings = {
    enabled: true,
    notificationSound: true,
    showUnreadBadge: true,
};

type SettingsKey = keyof ExtensionSettings;

interface SettingsStore {
    settings : ExtensionSettings;
    isInitialized : boolean;
    isInitializing : boolean;
    initialize : () => Promise<void>;
    toggle : ( key : SettingsKey ) => Promise<void>;
    update : ( key : SettingsKey, value : ExtensionSettings[ SettingsKey ] ) => Promise<void>;
}

const resolveFromStorage = async () : Promise<ExtensionSettings> => {
    if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
        return DEFAULT_SETTINGS;
    }

    return new Promise<ExtensionSettings>( ( resolve ) => {
        chrome.storage.local.get( "settings", ( result ) => {
            const storedSettings = ( result.settings ?? {} ) as Partial<ExtensionSettings>;
            resolve( {
                ...DEFAULT_SETTINGS,
                ...storedSettings,
            } );
        } );
    } );
};

const persistToStorage = async ( settings : ExtensionSettings ) => {
    if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
        return;
    }

    await chrome.storage.local.set( { settings } );
};

let storageListenerRegistered = false;

export const useSettingsStore = create<SettingsStore>( ( set, get ) => ( {
    settings: DEFAULT_SETTINGS,
    isInitialized: false,
    isInitializing: false,
    async initialize () {
        if ( get().isInitialized || get().isInitializing ) {
            return;
        }

        set( { isInitializing: true } );
        try {
            const settings = await resolveFromStorage();
            set( {
                settings,
                isInitialized: true,
            } );
        } finally {
            set( { isInitializing: false } );
        }

        if ( storageListenerRegistered || typeof chrome === "undefined" || !chrome.storage?.onChanged ) {
            return;
        }

        const listener : Parameters<typeof chrome.storage.onChanged.addListener>[ 0 ] = ( changes, areaName ) => {
            if ( areaName !== "local" || !changes.settings ) {
                return;
            }

            const nextValue = changes.settings.newValue as ExtensionSettings | undefined;
            if ( nextValue ) {
                set( { settings: { ...DEFAULT_SETTINGS, ...nextValue } } );
            }
        };

        chrome.storage.onChanged.addListener( listener );
        storageListenerRegistered = true;
    },
    async toggle ( key ) {
        const current = get().settings;
        const next = {
            ...current,
            [ key ]: !current[ key ],
        };

        set( { settings: next } );
        try {
            await persistToStorage( next );
        } catch ( error ) {
            console.error( "[EyeNote] Failed to persist settings toggle", { key, error } );
            set( { settings: current } );
        }
    },
    async update ( key, value ) {
        const current = get().settings;
        const next = {
            ...current,
            [ key ]: value,
        };

        set( { settings: next } );
        try {
            await persistToStorage( next );
        } catch ( error ) {
            console.error( "[EyeNote] Failed to persist settings update", { key, error } );
            set( { settings: current } );
        }
    },
} ) );

export const getDefaultSettings = () => DEFAULT_SETTINGS;
