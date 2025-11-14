import { create } from "zustand";
import type {
    AssignRolePayload,
    CreateGroupPayload,
    CreateGroupRolePayload,
    CreateGroupInvitePayload,
    GroupInviteRecord,
    GroupRecord,
    GroupRoleRecord,
    GroupWithRoles,
    JoinGroupResponse,
    RemoveRolePayload,
    UpdateGroupPayload,
    UpdateGroupRolePayload,
} from "@eye-note/definitions";

import { getGroupsApiClient } from "../api/groups-api-client";
import { getGroupsStorageAdapter } from "../storage/groups-storage-adapter";

type GroupsState = {
    groups : GroupRecord[];
    activeGroupIds : string[];
    isLoading : boolean;
    error ?: string;
    isHydrated : boolean;
    selectedGroupWithRoles ?: GroupWithRoles;
    rolesLoading : boolean;
    rolesError ?: string;
    invitesByGroupId : Record<string, GroupInviteRecord[]>;
    inviteStateByGroupId : Record<string, { loading : boolean; error ?: string }>;
};

type GroupsActions = {
    hydrateFromStorage : () => Promise<void>;
    listenToStorageChanges : () => void;
    fetchGroups : () => Promise<void>;
    createGroup : ( payload : CreateGroupPayload ) => Promise<GroupRecord>;
    joinGroupByCode : ( inviteCode : string ) => Promise<JoinGroupResponse>;
    leaveGroup : ( groupId : string ) => Promise<void>;
    updateGroup : ( groupId : string, payload : UpdateGroupPayload ) => Promise<GroupRecord>;
    setGroupActive : ( groupId : string, isActive : boolean ) => Promise<void>;
    setActiveGroupIds : ( groupIds : string[] ) => Promise<void>;
    fetchGroupWithRoles : ( groupId : string ) => Promise<void>;
    createGroupInvite : ( groupId : string, payload : CreateGroupInvitePayload ) => Promise<GroupInviteRecord>;
    fetchGroupInvites : ( groupId : string ) => Promise<GroupInviteRecord[]>;
    revokeGroupInvite : ( groupId : string, code : string ) => Promise<GroupInviteRecord>;
    createGroupRole : ( groupId : string, payload : CreateGroupRolePayload ) => Promise<GroupRoleRecord>;
    updateGroupRole : ( groupId : string, roleId : string, payload : UpdateGroupRolePayload ) => Promise<GroupRoleRecord>;
    assignRole : ( groupId : string, payload : AssignRolePayload ) => Promise<void>;
    removeRole : ( groupId : string, payload : RemoveRolePayload ) => Promise<void>;
    clearSelectedGroup : () => void;
    reset : () => void;
};

export type GroupsStore = GroupsState & GroupsActions;

const initialState : GroupsState = {
    groups: [],
    activeGroupIds: [],
    isLoading: false,
    error: undefined,
    isHydrated: false,
    selectedGroupWithRoles: undefined,
    rolesLoading: false,
    rolesError: undefined,
    invitesByGroupId: {},
    inviteStateByGroupId: {},
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
            const stored = await getGroupsStorageAdapter().getActiveGroupIds();
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

        const adapter = getGroupsStorageAdapter();
        if ( !adapter.subscribeToActiveGroupIds ) {
            return;
        }

        detachActiveGroupListener = adapter.subscribeToActiveGroupIds( ( nextIds ) => {
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
            await getGroupsStorageAdapter().setActiveGroupIds( normalized );
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
            const client = getGroupsApiClient();
            const groups = await client.listGroups();
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
        const client = getGroupsApiClient();
        const group = await client.createGroup( payload );

        set( ( state ) => ( {
            ...state,
            groups: [ group, ...state.groups.filter( ( existing ) => existing.id !== group.id ) ],
        } ) );

        const current = get().activeGroupIds.filter( ( id ) => id !== group.id );
        await get().setActiveGroupIds( [ ...current, group.id ] );

        return group;
    },
    async joinGroupByCode ( inviteCode ) {
        const client = getGroupsApiClient();
        const response = await client.joinGroupByCode( inviteCode.trim() );

        if ( response.joined ) {
            const { group } = response;
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
        }

        return response;
    },
    async fetchGroupInvites ( groupId ) {
        set( ( state ) => ( {
            ...state,
            inviteStateByGroupId: {
                ...state.inviteStateByGroupId,
                [ groupId ]: { loading: true },
            },
        } ) );

        try {
            const client = getGroupsApiClient();
            const invites = await client.listGroupInvites( groupId );
            set( ( state ) => ( {
                ...state,
                invitesByGroupId: {
                    ...state.invitesByGroupId,
                    [ groupId ]: invites,
                },
                inviteStateByGroupId: {
                    ...state.inviteStateByGroupId,
                    [ groupId ]: { loading: false, error: undefined },
                },
            } ) );
            return invites;
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to load invites";
            set( ( state ) => ( {
                ...state,
                inviteStateByGroupId: {
                    ...state.inviteStateByGroupId,
                    [ groupId ]: { loading: false, error: message },
                },
            } ) );
            throw error;
        }
    },
    async createGroupInvite ( groupId, payload ) {
        const client = getGroupsApiClient();
        const invite = await client.createGroupInvite( groupId, payload );

        set( ( state ) => ( {
            ...state,
            invitesByGroupId: {
                ...state.invitesByGroupId,
                [ groupId ]: [ invite, ...( state.invitesByGroupId[ groupId ] ?? [] ) ],
            },
        } ) );

        return invite;
    },
    async revokeGroupInvite ( groupId, code ) {
        const client = getGroupsApiClient();
        const invite = await client.revokeGroupInvite( groupId, code );

        set( ( state ) => ( {
            ...state,
            invitesByGroupId: {
                ...state.invitesByGroupId,
                [ groupId ]: ( state.invitesByGroupId[ groupId ] ?? [] ).map( ( existing ) =>
                    existing.id === invite.id ? invite : existing
                ),
            },
        } ) );

        return invite;
    },
    async leaveGroup ( groupId ) {
        const client = getGroupsApiClient();
        await client.leaveGroup( groupId );

        set( ( state ) => ( {
            ...state,
            groups: state.groups.filter( ( group ) => group.id !== groupId ),
        } ) );

        const next = get().activeGroupIds.filter( ( id ) => id !== groupId );
        await get().setActiveGroupIds( next );
    },
    async updateGroup ( groupId, payload ) {
        const client = getGroupsApiClient();
        const updated = await client.updateGroup( groupId, payload );

        set( ( state ) => ( {
            ...state,
            groups: state.groups.map( ( group ) => ( group.id === updated.id ? updated : group ) ),
        } ) );

        return updated;
    },
    async fetchGroupWithRoles ( groupId ) {
        set( ( state ) => ( {
            ...state,
            rolesLoading: true,
            rolesError: undefined,
        } ) );

        try {
            const client = getGroupsApiClient();
            const groupWithRoles = await client.getGroupWithRoles( groupId );
            set( ( state ) => ( {
                ...state,
                selectedGroupWithRoles: groupWithRoles,
                rolesLoading: false,
            } ) );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to load group roles";
            set( ( state ) => ( {
                ...state,
                rolesLoading: false,
                rolesError: message,
            } ) );
        }
    },
    async createGroupRole ( groupId, payload ) {
        const client = getGroupsApiClient();
        const role = await client.createGroupRole( groupId, payload );

        set( ( state ) => {
            if ( !state.selectedGroupWithRoles || state.selectedGroupWithRoles.id !== groupId ) {
                return state;
            }

            return {
                ...state,
                selectedGroupWithRoles: {
                    ...state.selectedGroupWithRoles,
                    roles: [ role, ...state.selectedGroupWithRoles.roles ],
                },
            };
        } );

        return role;
    },
    async updateGroupRole ( groupId, roleId, payload ) {
        const client = getGroupsApiClient();
        const updated = await client.updateGroupRole( groupId, roleId, payload );

        set( ( state ) => {
            if ( !state.selectedGroupWithRoles || state.selectedGroupWithRoles.id !== groupId ) {
                return state;
            }

            return {
                ...state,
                selectedGroupWithRoles: {
                    ...state.selectedGroupWithRoles,
                    roles: state.selectedGroupWithRoles.roles.map( ( role ) =>
                        role.id === updated.id ? updated : role
                    ),
                },
            };
        } );

        return updated;
    },
    async assignRole ( groupId, payload ) {
        const client = getGroupsApiClient();
        await client.assignRole( groupId, payload );
        await get().fetchGroupWithRoles( groupId );
    },
    async removeRole ( groupId, payload ) {
        const client = getGroupsApiClient();
        await client.removeRole( groupId, payload );
        await get().fetchGroupWithRoles( groupId );
    },
    clearSelectedGroup () {
        set( ( state ) => ( {
            ...state,
            selectedGroupWithRoles: undefined,
            rolesError: undefined,
        } ) );
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
