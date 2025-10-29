import { create } from "zustand";

type BackendHealthStatus = "unknown" | "pending" | "healthy" | "unhealthy";

type BackendHealthState = {
    status : BackendHealthStatus;
    lastChecked ?: number;
    error : string | null;
    setPending : () => void;
    setHealthy : () => void;
    setUnhealthy : ( error ?: string | null ) => void;
    reset : () => void;
};

export const useBackendHealthStore = create<BackendHealthState>( ( set ) => ( {
    status: "unknown",
    lastChecked: undefined,
    error: null,
    setPending () {
        set( { status: "pending", error: null } );
    },
    setHealthy () {
        set( { status: "healthy", lastChecked: Date.now(), error: null } );
    },
    setUnhealthy ( error ) {
        set( { status: "unhealthy", lastChecked: Date.now(), error: error ?? null } );
    },
    reset () {
        set( { status: "unknown", lastChecked: undefined, error: null } );
    },
} ) );

export type { BackendHealthStatus };
