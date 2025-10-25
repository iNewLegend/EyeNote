import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    ListGroupsResponse,
    UpdateGroupPayload,
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
