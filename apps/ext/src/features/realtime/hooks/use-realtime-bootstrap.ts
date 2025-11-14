import { useEffect, useMemo } from "react";
import { useAuthStore } from "@eye-note/auth/extension";
import { useGroupsStore } from "@eye-note/groups";
import { useRealtimeStore } from "../realtime-store";

export function useRealtimeBootstrap () {
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const ensureConnected = useRealtimeStore( ( state ) => state.ensureConnected );
    const disconnect = useRealtimeStore( ( state ) => state.disconnect );

    const scopeKey = useMemo( () => activeGroupIds.slice().sort().join( "|" ), [ activeGroupIds ] );

    useEffect( () => {
        if ( !isAuthenticated ) {
            disconnect();
            return;
        }

        void ensureConnected( activeGroupIds );
    }, [ isAuthenticated, scopeKey, activeGroupIds, ensureConnected, disconnect ] );
}
