import { resolveBackendUrl } from "./resolve-backend-url";
import { useBackendHealthStore } from "./store";

type BackendHealthCheckResult = {
    healthy : boolean;
    error ?: string;
};

type BackendHealthFetcher = () => Promise<BackendHealthCheckResult>;

async function defaultFetcher () : Promise<BackendHealthCheckResult> {
    const baseUrl = resolveBackendUrl();
    const url = new URL( "/healthz", baseUrl );

    try {
        const response = await fetch( url.toString(), {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        } );

        if ( !response.ok ) {
            return {
                healthy: false,
                error: `Health check failed (${ response.status })`,
            };
        }

        return { healthy: true };
    } catch ( error ) {
        const message = error instanceof Error ? error.message : "Health check failed";
        return {
            healthy: false,
            error: message,
        };
    }
}

type CheckOptions = {
    fetcher ?: BackendHealthFetcher;
};

export async function checkBackendHealth ( options : CheckOptions = {} ) {
    const { fetcher = defaultFetcher } = options;
    const state = useBackendHealthStore.getState();
    state.setPending();

    const result = await fetcher();
    if ( result.healthy ) {
        state.setHealthy();
        return true;
    }

    state.setUnhealthy( result.error );
    return false;
}

export type { BackendHealthFetcher, BackendHealthCheckResult };
