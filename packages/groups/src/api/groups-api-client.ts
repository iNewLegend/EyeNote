import type {
    AssignRolePayload,
    CreateGroupPayload,
    CreateGroupRolePayload,
    GroupInviteRecord,
    GroupRecord,
    GroupRoleRecord,
    GroupWithRoles,
    JoinGroupResponse,
    RemoveRolePayload,
    UpdateGroupPayload,
    UpdateGroupRolePayload,
} from "@eye-note/definitions";

export interface GroupsApiClient {
    listGroups : () => Promise<GroupRecord[]>;
    createGroup : ( payload : CreateGroupPayload ) => Promise<GroupRecord>;
    joinGroupByCode : ( inviteCode : string ) => Promise<JoinGroupResponse>;
    leaveGroup : ( groupId : string ) => Promise<void>;
    updateGroup : ( groupId : string, payload : UpdateGroupPayload ) => Promise<GroupRecord>;
    getGroupWithRoles : ( groupId : string ) => Promise<GroupWithRoles>;
    createGroupRole : ( groupId : string, payload : CreateGroupRolePayload ) => Promise<GroupRoleRecord>;
    updateGroupRole : ( groupId : string, roleId : string, payload : UpdateGroupRolePayload ) => Promise<GroupRoleRecord>;
    assignRole : ( groupId : string, payload : AssignRolePayload ) => Promise<void>;
    removeRole : ( groupId : string, payload : RemoveRolePayload ) => Promise<void>;
    createGroupInvite : ( groupId : string, email : string, expiresInHours ?: number ) => Promise<GroupInviteRecord>;
}

let groupsApiClient : GroupsApiClient | null = null;

export function configureGroupsApiClient ( client : GroupsApiClient ) {
    groupsApiClient = client;
}

export function getGroupsApiClient () : GroupsApiClient {
    if ( !groupsApiClient ) {
        throw new Error( "[EyeNote] Groups API client not configured" );
    }

    return groupsApiClient;
}
