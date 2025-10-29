import { useEffect } from "react";
import { useBackendHealthStore } from "@eye-note/backend-health";
import { useModeStore, AppMode } from "../stores/use-mode-store";

type BackendHealthOptions = {
    onUpdate ?: ( healthy : boolean ) => void;
    syncModeStore ?: boolean;
};

export function useBackendHealthBridge ( options : BackendHealthOptions = {} ) {
    const { onUpdate, syncModeStore = true } = options;

    useEffect( () => {
        if ( typeof chrome === "undefined" || !chrome.runtime?.onMessage ) {
            return;
        }

        const applyHealthUpdate = ( healthy : boolean ) => {
            const healthStore = useBackendHealthStore.getState();
            if ( healthy ) {
                healthStore.setHealthy();
            } else {
                healthStore.setUnhealthy();
            }

            if ( syncModeStore ) {
                const store = useModeStore.getState();
                const connected = store.isMode( AppMode.CONNECTED );

                if ( healthy && !connected ) {
                    store.addMode( AppMode.CONNECTED );
                } else if ( !healthy && connected ) {
                    store.removeMode( AppMode.CONNECTED );
                }
            }

            onUpdate?.( healthy );
        };

        const listener : Parameters<typeof chrome.runtime.onMessage.addListener>[0] = ( message ) => {
            if ( message?.type === "BACKEND_HEALTH_UPDATE" ) {
                applyHealthUpdate( Boolean( message.healthy ) );
            }
        };

        chrome.runtime.onMessage.addListener( listener );

        const healthStore = useBackendHealthStore.getState();
        healthStore.setPending();

        chrome.runtime
            .sendMessage( { type: "GET_BACKEND_STATUS" } )
            .then( ( response ) => {
                if ( response && typeof response.healthy === "boolean" ) {
                    applyHealthUpdate( response.healthy );
                } else {
                    healthStore.setUnhealthy();
                }
            } )
            .catch( () => {
                applyHealthUpdate( false );
            } );

        return () => {
            chrome.runtime.onMessage.removeListener( listener );
        };
    }, [ onUpdate, syncModeStore ] );
}
