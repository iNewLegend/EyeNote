import { useEffect } from "react";
import { useAuthStore } from "@eye-note/auth/extension";
import { useNotificationsStore } from "../notifications-store";

export function useNotificationsBootstrap () {
    const isAuthenticated = useAuthStore( ( state ) => state.isAuthenticated );
    const bootstrap = useNotificationsStore( ( state ) => state.bootstrap );
    const reset = useNotificationsStore( ( state ) => state.reset );

    useEffect( () => {
        if ( !isAuthenticated ) {
            reset();
            return;
        }

        void bootstrap();
    }, [ isAuthenticated, bootstrap, reset ] );
}
