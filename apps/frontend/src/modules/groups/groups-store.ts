import { create } from "zustand";
import type { CreateGroupPayload, GroupRecord, UpdateGroupPayload } from "@eye-note/definitions";
import {
    createGroup as createGroupApi,
    joinGroup as joinGroupApi,
    leaveGroup as leaveGroupApi,
    listGroups,
    updateGroup as updateGroupApi,
} from "./groups-api";
import {
    getStoredActiveGroupIds,
    setStoredActiveGroupIds,
    subscribeToActiveGroupIds,
} from "./groups-storage";

type GroupsState = {
    groups : GroupRecord[];
    activeGroupIds : string[];
    isLoading : boolean;
    error ?: string;
    isHydrated : boolean;
};

type GroupsActions = {
    hydrateFromStorage : () => Promise<void>;
    listenToStorageChanges : () => void;
    fetchGroups : () => Promise<void>;
    createGroup : ( payload : CreateGroupPayload ) => Promise<GroupRecord>;
    joinGroupByCode : ( inviteCode : string ) => Promise<{
        group : GroupRecord;
        joined : boolean;
    }>;
    leaveGroup : ( groupId : string ) => Promise<void>;
    updateGroup : ( groupId : string, payload : UpdateGroupPayload ) => Promise<GroupRecord>;
    setGroupActive : ( groupId : string, isActive : boolean ) => Promise<void>;
    setActiveGroupIds : ( groupIds : string[] ) => Promise<void>;
    reset : () => void;
};

export type GroupsStore = GroupsState & GroupsActions;

const initialState : GroupsState = {
    groups: [],
    activeGroupIds: [],
    isLoading: false,
    error: undefined,
    isHydrated: false,
};

function normalizeActiveGroupIds ( groupIds : string[], groups : GroupRecord[] ) : string[] {
    const allowedIds = new Set( groups.map( ( group ) => group.id ) );
    const next : string[] = [];

    groupIds.forEach( ( id ) => {
        if ( id === "" || allowedIds.has( id ) ) {
            if ( !next.includes( id ) ) {
                next.push( id );
            }
        }
    } );

    return next;
}

let detachActiveGroupListener : ( () => void ) | null = null;

export const useGroupsStore = create<GroupsStore>( ( set, get ) => ( {
    ...initialState,
    async hydrateFromStorage () {
        if ( get().isHydrated ) {
            return;
        }

        try {
            const stored = await getStoredActiveGroupIds();
            const normalized = normalizeActiveGroupIds( stored, get().groups );
            set( ( state ) => ( {
                ...state,
                activeGroupIds: normalized,
                isHydrated: true,
            } ) );
        } catch ( error ) {
            console.warn( "[EyeNote] Failed to hydrate active groups from storage", error );
            set( ( state ) => ( {
                ...state,
                activeGroupIds: [],
                isHydrated: true,
            } ) );
        }
    },
    listenToStorageChanges () {
        if ( detachActiveGroupListener ) {
            return;
        }

        detachActiveGroupListener = subscribeToActiveGroupIds( ( nextIds ) => {
            set( ( state ) => ( {
                ...state,
                activeGroupIds: normalizeActiveGroupIds( nextIds, state.groups ),
            } ) );
        } );
    },
    async setActiveGroupIds ( groupIds ) {
        const normalized = normalizeActiveGroupIds( groupIds, get().groups );
        set( ( state ) => ( {
            ...state,
            activeGroupIds: normalized,
        } ) );

        try {
            await setStoredActiveGroupIds( normalized );
        } catch ( error ) {
            console.warn( "[EyeNote] Failed to persist active groups", error );
        }
    },
    async setGroupActive ( groupId, isActive ) {
        const current = get().activeGroupIds;

        const next = isActive
            ? [ ...current.filter( ( id ) => id !== groupId ), groupId ]
            : current.filter( ( id ) => id !== groupId );

        await get().setActiveGroupIds( next );
    },
    async fetchGroups () {
        set( ( state ) => ( {
            ...state,
            isLoading: true,
            error: undefined,
        } ) );

        try {
            const groups = await listGroups();
            set( ( state ) => ( {
                ...state,
                groups,
                activeGroupIds: normalizeActiveGroupIds( state.activeGroupIds, groups ),
                isLoading: false,
            } ) );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to load groups";
            set( ( state ) => ( {
                ...state,
                isLoading: false,
                error: message,
            } ) );
        }
    },
    async createGroup ( payload ) {
        const group = await createGroupApi( payload );

        set( ( state ) => ( {
            ...state,
            groups: [ group, ...state.groups.filter( ( existing ) => existing.id !== group.id ) ],
        } ) );

        const current = get().activeGroupIds.filter( ( id ) => id !== group.id );
        await get().setActiveGroupIds( [ ...current, group.id ] );

        return group;
    },
    async joinGroupByCode ( inviteCode ) {
        const response = await joinGroupApi( { inviteCode: inviteCode.trim() } );
        const { group, joined } = response;

        set( ( state ) => {
            const nextGroups = state.groups.some( ( existing ) => existing.id === group.id )
                ? state.groups.map( ( existing ) => ( existing.id === group.id ? group : existing ) )
                : [ group, ...state.groups ];

            return {
                ...state,
                groups: nextGroups,
            };
        } );

        const current = get().activeGroupIds.filter( ( id ) => id !== group.id );
        await get().setActiveGroupIds( [ ...current, group.id ] );

        return {
            group,
            joined,
        };
    },
    async leaveGroup ( groupId ) {
        await leaveGroupApi( groupId );

        set( ( state ) => ( {
            ...state,
            groups: state.groups.filter( ( group ) => group.id !== groupId ),
        } ) );

        const next = get().activeGroupIds.filter( ( id ) => id !== groupId );
        await get().setActiveGroupIds( next );
    },
    async updateGroup ( groupId, payload ) {
        const updated = await updateGroupApi( groupId, payload );

        set( ( state ) => ( {
            ...state,
            groups: state.groups.map( ( group ) => ( group.id === updated.id ? updated : group ) ),
        } ) );

        return updated;
    },
    reset () {
        if ( detachActiveGroupListener ) {
            detachActiveGroupListener();
            detachActiveGroupListener = null;
        }

        initializePromise = null;

        set( {
            ...initialState,
        } );
    },
} ) );

let initializePromise : Promise<void> | null = null;

export function initializeGroupsStore () : Promise<void> {
    if ( initializePromise ) {
        return initializePromise;
    }

    initializePromise = ( async () => {
        const store = useGroupsStore.getState();
        await store.hydrateFromStorage();
        store.listenToStorageChanges();
    } )();

    return initializePromise;
}
