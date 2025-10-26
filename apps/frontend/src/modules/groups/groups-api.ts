import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    ListGroupsResponse,
    UpdateGroupPayload,
    GroupWithRoles,
    GroupRoleRecord,
    CreateGroupRolePayload,
    UpdateGroupRolePayload,
    AssignRolePayload,
    RemoveRolePayload,
} from "@eye-note/definitions";
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

export async function joinGroup ( payload : JoinGroupPayload ) : Promise<{
    group : GroupRecord;
    joined : boolean;
}> {
    const response = await apiRequest<{
        group : GroupRecord;
        joined : boolean;
    }>( "/api/groups/join", {
        method: "POST",
        bodyJson: payload,
    } );

    return response;
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
