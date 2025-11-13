import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    JoinGroupResponse,
    ListGroupsResponse,
    UpdateGroupPayload,
    GroupWithRoles,
    GroupRoleRecord,
    CreateGroupRolePayload,
    UpdateGroupRolePayload,
    AssignRolePayload,
    RemoveRolePayload,
    ReviewJoinRequestResponse,
    CreateGroupInvitePayload,
    GroupInviteRecord,
} from "@eye-note/definitions";
import type { GroupsApiClient } from "@eye-note/groups";
import { apiRequest } from "../../lib/api-client";

export async function listGroups () : Promise<GroupRecord[]> {
    const response = await apiRequest<ListGroupsResponse>( "/api/groups" );
    return response.groups;
}

export async function createGroup ( payload : CreateGroupPayload ) : Promise<GroupRecord> {
    const response = await apiRequest<{ group : GroupRecord }>( "/api/groups", {
        method: "POST",
        bodyJson: payload,
    } );

    return response.group;
}

export async function joinGroup ( payload : JoinGroupPayload ) : Promise<JoinGroupResponse> {
    return apiRequest<JoinGroupResponse>( "/api/groups/join", {
        method: "POST",
        bodyJson: payload,
    } );
}

export async function leaveGroup ( groupId : string ) : Promise<{
    group : GroupRecord;
    left : boolean;
}> {
    const response = await apiRequest<{
        group : GroupRecord;
        left : boolean;
    }>( `/api/groups/${ groupId }/leave`, {
        method: "POST",
    } );

    return response;
}

export async function updateGroup ( groupId : string, payload : UpdateGroupPayload ) : Promise<GroupRecord> {
    const response = await apiRequest<{ group : GroupRecord }>( `/api/groups/${ groupId }`, {
        method: "PATCH",
        bodyJson: payload,
    } );

    return response.group;
}

export async function getGroupWithRoles ( groupId : string ) : Promise<GroupWithRoles> {
    const response = await apiRequest<{ group : GroupWithRoles }>( `/api/groups/${ groupId }/roles` );
    return response.group;
}

export async function createGroupRole ( groupId : string, payload : CreateGroupRolePayload ) : Promise<GroupRoleRecord> {
    const response = await apiRequest<{ role : GroupRoleRecord }>( `/api/groups/${ groupId }/roles`, {
        method: "POST",
        bodyJson: payload,
    } );

    return response.role;
}

export async function updateGroupRole ( groupId : string, roleId : string, payload : UpdateGroupRolePayload ) : Promise<GroupRoleRecord> {
    const response = await apiRequest<{ role : GroupRoleRecord }>( `/api/groups/${ groupId }/roles/${ roleId }`, {
        method: "PATCH",
        bodyJson: payload,
    } );

    return response.role;
}

export async function assignRole ( groupId : string, payload : AssignRolePayload ) : Promise<void> {
    await apiRequest<{ success : boolean }>( `/api/groups/${ groupId }/roles/assign`, {
        method: "POST",
        bodyJson: payload,
    } );
}

export async function removeRole ( groupId : string, payload : RemoveRolePayload ) : Promise<void> {
    await apiRequest<{ success : boolean }>( `/api/groups/${ groupId }/roles/remove`, {
        method: "POST",
        bodyJson: payload,
    } );
}

export async function createGroupInvite ( groupId : string, payload : CreateGroupInvitePayload ) : Promise<GroupInviteRecord> {
    const response = await apiRequest<{ invite : GroupInviteRecord }>( `/api/groups/${ groupId }/invitations`, {
        method: "POST",
        bodyJson: payload,
    } );
    return response.invite;
}

export async function approveJoinRequest ( groupId : string, requestId : string ) : Promise<ReviewJoinRequestResponse> {
    return apiRequest<ReviewJoinRequestResponse>( `/api/groups/${ groupId }/requests/${ requestId }/approve`, {
        method: "POST",
    } );
}

export async function rejectJoinRequest ( groupId : string, requestId : string ) : Promise<ReviewJoinRequestResponse> {
    return apiRequest<ReviewJoinRequestResponse>( `/api/groups/${ groupId }/requests/${ requestId }/reject`, {
        method: "POST",
    } );
}

export const groupsApiClient : GroupsApiClient = {
    listGroups,
    createGroup,
    joinGroupByCode : ( inviteCode : string ) => joinGroup( { inviteCode } ),
    leaveGroup : async ( groupId : string ) => {
        await leaveGroup( groupId );
    },
    updateGroup,
    getGroupWithRoles,
    createGroupRole,
    updateGroupRole,
    assignRole,
    removeRole,
    createGroupInvite : ( groupId : string, email : string, expiresInHours ?: number ) =>
        createGroupInvite( groupId, {
            email,
            ...( expiresInHours ? { expiresInHours } : {} ),
        } ),
};
