import { useEffect, useRef } from "react";
import { checkBackendHealth, type BackendHealthFetcher } from "./check-backend-health";
import { useBackendHealthStore } from "./store";

type UseBackendHealthOptions = {
    intervalMs ?: number;
    enabled ?: boolean;
    fetcher ?: BackendHealthFetcher;
};

export function useBackendHealthPolling ( options : UseBackendHealthOptions = {} ) {
    const { intervalMs = 15000, enabled = true, fetcher } = options;
    const fetcherRef = useRef( fetcher );

    useEffect( () => {
        fetcherRef.current = fetcher;
    }, [ fetcher ] );

    useEffect( () => {
        if ( !enabled ) {
            return;
        }

        let cancelled = false;

        const runCheck = async () => {
            const selectedFetcher = fetcherRef.current;
            await checkBackendHealth( {
                fetcher: selectedFetcher,
            } );
        };

        void runCheck();

        const intervalId = window.setInterval( () => {
            if ( cancelled ) {
                return;
            }
            void runCheck();
        }, intervalMs );

        return () => {
            cancelled = true;
            window.clearInterval( intervalId );
        };
    }, [ enabled, intervalMs ] );
}

export { useBackendHealthStore };
