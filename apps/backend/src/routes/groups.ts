import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    JoinGroupResponse,
    ListGroupsResponse,
    GroupWithRoles,
    CreateGroupRolePayload,
    UpdateGroupRolePayload,
    AssignRolePayload,
    RemoveRolePayload,
    GroupJoinRequestRecord,
    GroupJoinRequestStatus,
    GroupInviteRecord,
    CreateGroupInvitePayload,
    ReviewJoinRequestResponse,
} from "@eye-note/definitions";
import { GroupPermission } from "@eye-note/definitions";
import type { FastifyInstance } from "fastify";
import { GroupModel, type GroupDocument } from "../models/group";
import { GroupRoleModel, type GroupRoleDocument } from "../models/group-role";
import { GroupMemberRoleModel, type GroupMemberRoleDocument } from "../models/group-member-role";
import { GroupJoinRequestModel, type GroupJoinRequestDocument } from "../models/group-join-request";
import { GroupInviteModel, type GroupInviteDocument } from "../models/group-invite";
import { RoleService } from "../services/role-service";
import {
    createGroupJoinRequestNotifications,
    createGroupJoinDecisionNotification,
    serializeNotification,
} from "@eye-note/backend-models";
import { broadcastNotifications } from "../services/notification-bus";

const DEFAULT_GROUP_COLOR = "#6366f1";

function toHexId ( value : unknown ) : string {
    if ( value && typeof ( value as { toHexString ?: () => string } ).toHexString === "function" ) {
        return ( value as { toHexString : () => string } ).toHexString();
    }
    return String( value );
}

function normalizeColor ( color ?: string ) : string {
    if ( !color ) {
        return DEFAULT_GROUP_COLOR;
    }

    return color.toLowerCase();
}

const colorSchema = z
    .string()
    .regex( /^#(?:[0-9a-fA-F]{3}){1,2}$/ );

const createGroupSchema = z.object( {
    name: z.string().min( 1 ).max( 80 ),
    description: z.string().max( 280 ).optional(),
    color: colorSchema.optional(),
} );

const updateGroupSchema = z.object( {
    name: z.string().min( 1 ).max( 80 ).optional(),
    description: z.string().max( 280 ).optional(),
    color: colorSchema.optional(),
} );

const joinGroupSchema = z.object( {
    inviteCode: z.string().min( 4 ).max( 32 ),
} );

const leaveGroupParamsSchema = z.object( {
    groupId: z.string().min( 1 ),
} );

const requestParamsSchema = z.object( {
    groupId: z.string().min( 1 ),
    requestId: z.string().min( 1 ),
} );

function slugify ( input : string ) : string {
    return input
        .toLowerCase()
        .trim()
        .replace( /[^a-z0-9\s-]/g, "" )
        .replace( /\s+/g, "-" )
        .replace( /-+/g, "-" )
        .replace( /^-|-$/g, "" );
}

async function generateUniqueSlug ( name : string ) : Promise<string> {
    const baseSlug = slugify( name ) || `group-${ randomBytes( 2 ).toString( "hex" ) }`;

    let candidate = baseSlug;
    let attempt = 0;

    while ( await GroupModel.exists( { slug: candidate } ) ) {
        attempt += 1;
        candidate = `${ baseSlug }-${ attempt }`;
        if ( attempt > 10 ) {
            candidate = `${ baseSlug }-${ randomBytes( 2 ).toString( "hex" ) }`;
        }
    }

    return candidate;
}

async function generateUniqueInviteCode () : Promise<string> {
    let candidate = randomBytes( 4 ).toString( "hex" );

    while ( await GroupModel.exists( { inviteCode: candidate } ) ) {
        candidate = randomBytes( 4 ).toString( "hex" );
    }

    return candidate;
}

async function generateOneTimeInviteCode () : Promise<string> {
    let candidate = randomBytes( 6 ).toString( "hex" ).toUpperCase();
    while ( await GroupInviteModel.exists( { code: candidate } ) ) {
        candidate = randomBytes( 6 ).toString( "hex" ).toUpperCase();
    }
    return candidate;
}

function serializeGroup ( doc : GroupDocument ) : GroupRecord {
    return {
        id: toHexId( doc._id ),
        name: doc.name,
        description: doc.description ?? undefined,
        slug: doc.slug,
        inviteCode: doc.inviteCode,
        ownerId: doc.ownerId,
        color: doc.color,
        memberCount: doc.memberIds.length,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function serializeGroupRole ( doc : GroupRoleDocument ) {
    return {
        id: doc._id.toHexString(),
        name: doc.name,
        description: doc.description ?? undefined,
        color: doc.color,
        permissions: doc.permissions,
        position: doc.position,
        groupId: doc.groupId,
        isDefault: doc.isDefault,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function serializeGroupMemberRole ( doc : GroupMemberRoleDocument ) {
    return {
        userId: doc.userId,
        roleId: doc.roleId,
        assignedAt: doc.assignedAt.toISOString(),
        assignedBy: doc.assignedBy,
    };
}

function serializeJoinRequest ( doc : GroupJoinRequestDocument ) : GroupJoinRequestRecord {
    return {
        id: toHexId( doc._id ),
        groupId: doc.groupId,
        groupName: doc.groupName,
        userId: doc.userId,
        userName: doc.userName ?? undefined,
        inviteCode: doc.inviteCode,
        status: doc.status,
        processedBy: doc.processedBy ?? undefined,
        processedAt: doc.processedAt ? doc.processedAt.toISOString() : undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function serializeGroupInvite ( doc : GroupInviteDocument ) : GroupInviteRecord {
    return {
        id: toHexId( doc._id ),
        groupId: doc.groupId,
        email: doc.email,
        code: doc.code,
        status: doc.status,
        expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
        usedAt: doc.usedAt ? doc.usedAt.toISOString() : null,
        usedBy: doc.usedBy ?? null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

async function resolveGroupManagerUserIds ( groupId : string ) : Promise<string[]> {
    const group = await GroupModel.findById( groupId ).lean<{
        ownerId : string;
    }>();

    if ( !group ) {
        return [];
    }

    const roles = await GroupRoleModel.find( { groupId } ).exec();

    const managerRoleIds = roles
        .filter( ( role ) => role.permissions.includes( GroupPermission.MANAGE_MEMBERS ) || role.permissions.includes( GroupPermission.MANAGE_GROUP ) )
        .map( ( role ) => role._id.toHexString() );

    if ( managerRoleIds.length === 0 ) {
        return [ group.ownerId ];
    }

    const assignedManagers = await GroupMemberRoleModel.find( {
        groupId,
        roleId: { $in: managerRoleIds },
    } )
        .select( [ "userId" ] )
        .exec();

    const recipients = new Set<string>( [ group.ownerId ] );
    assignedManagers.forEach( ( member ) => recipients.add( member.userId ) );
    return Array.from( recipients );
}

async function canManageJoinRequests ( groupId : string, userId : string ) : Promise<boolean> {
    const group = await GroupModel.findById( groupId ).lean<{
        ownerId : string;
    }>();

    if ( !group ) {
        return false;
    }

    if ( group.ownerId === userId ) {
        return true;
    }

    return RoleService.hasPermission( groupId, userId, GroupPermission.MANAGE_MEMBERS );
}

export async function groupsRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "GET",
        url: "/api/groups",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const userId = request.user!.id;

            const groups = await GroupModel.find( {
                memberIds: userId,
            } )
                .sort( { updatedAt: -1 } )
                .exec();

            const payload : ListGroupsResponse = {
                groups: groups.map( ( group ) => serializeGroup( group ) ),
            };

            reply.code( 200 ).send( payload );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const parseResult = createGroupSchema.safeParse( request.body );

            if ( !parseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: parseResult.error.flatten(),
                } );
                return;
            }

            const payload = parseResult.data as CreateGroupPayload;

            const slug = await generateUniqueSlug( payload.name );
            const inviteCode = await generateUniqueInviteCode();
            const color = normalizeColor( payload.color );

            const created = await GroupModel.create( {
                name: payload.name,
                description: payload.description ?? null,
                slug,
                inviteCode,
                ownerId: request.user!.id,
                memberIds: [ request.user!.id ],
                color,
            } );

            await RoleService.createDefaultRoles( toHexId( created._id ), request.user!.id );

            reply.code( 201 ).send( {
                group: serializeGroup( created ),
            } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/invitations",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const bodyParseResult = createInviteSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            if ( !( await canManageJoinRequests( groupId, request.user!.id ) ) ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const { email, expiresInHours } = bodyParseResult.data as CreateGroupInvitePayload;
            const code = await generateOneTimeInviteCode();
            const expiresAt = expiresInHours
                ? new Date( Date.now() + expiresInHours * 60 * 60 * 1000 )
                : null;

            const invite = await GroupInviteModel.create( {
                groupId,
                email: email.toLowerCase(),
                code,
                status: "pending",
                expiresAt,
            } );

            fastify.log.info( {
                event: "group.invite.create",
                groupId,
                email,
                inviteCode: code,
            }, "Group invite created" );

            reply.code( 201 ).send( { invite: serializeGroupInvite( invite as GroupInviteDocument ) } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/join",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const parseResult = joinGroupSchema.safeParse( request.body );

            if ( !parseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: parseResult.error.flatten(),
                } );
                return;
            }

            const payload = parseResult.data as JoinGroupPayload;

            const group = await GroupModel.findOne( {
                inviteCode: payload.inviteCode.trim(),
            } ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            const userId = request.user!.id;

            const groupId = toHexId( group._id );
            const trimmedCode = payload.inviteCode.trim();

            const invite = await GroupInviteModel.findOne( { code: trimmedCode } ).exec();

            if ( invite ) {
                if ( invite.groupId !== groupId ) {
                    reply.code( 404 ).send( { error: "invite_not_found" } );
                    return;
                }

                if ( invite.status !== "pending" ) {
                    reply.code( 410 ).send( { error: "invite_used" } );
                    return;
                }

                if ( invite.expiresAt && invite.expiresAt.getTime() < Date.now() ) {
                    reply.code( 410 ).send( { error: "invite_expired" } );
                    return;
                }

                const inviteEmail = invite.email.toLowerCase();
                const userEmail = request.user?.email?.toLowerCase();

                if ( inviteEmail && userEmail && inviteEmail !== userEmail ) {
                    reply.code( 403 ).send( { error: "invite_email_mismatch" } );
                    return;
                }

                if ( !group.memberIds.includes( userId ) ) {
                    group.memberIds.push( userId );
                    await group.save();
                }

                invite.status = "used";
                invite.usedAt = new Date();
                invite.usedBy = userId;
                await invite.save();

                const response : JoinGroupResponse = {
                    group: serializeGroup( group ),
                    joined: true,
                    requiresApproval: false,
                };
                reply.code( 200 ).send( response );
                return;
            }

            if ( group.memberIds.includes( userId ) ) {
                const response : JoinGroupResponse = {
                    group: serializeGroup( group ),
                    joined: false,
                    requiresApproval: false,
                };
                reply.code( 200 ).send( response );
                return;
            }

            const userName = request.user?.name ?? undefined;

            let joinRequest = await GroupJoinRequestModel.findOne( {
                groupId,
                userId,
            } ).exec();

            if ( joinRequest && joinRequest.status === "pending" ) {
                const response : JoinGroupResponse = {
                    group: serializeGroup( group ),
                    joined: false,
                    requiresApproval: true,
                    request: serializeJoinRequest( joinRequest ),
                };
                reply.code( 200 ).send( response );
                return;
            }

            if ( joinRequest ) {
                joinRequest.status = "pending";
                joinRequest.processedAt = null;
                joinRequest.processedBy = null;
                joinRequest.groupName = group.name;
                joinRequest.inviteCode = trimmedCode;
                joinRequest.userName = userName ?? null;
                await joinRequest.save();
            } else {
                joinRequest = await GroupJoinRequestModel.create( {
                    groupId,
                    groupName: group.name,
                    userId,
                    userName: userName ?? null,
                    inviteCode: trimmedCode,
                    status: "pending" satisfies GroupJoinRequestStatus,
                } );
            }

            const serializedRequest = serializeJoinRequest( joinRequest );

            try {
                const managerUserIds = await resolveGroupManagerUserIds( groupId );
                const notificationDocs = await createGroupJoinRequestNotifications( {
                    requestId: serializedRequest.id,
                    groupId,
                    groupName: group.name,
                    requesterId: userId,
                    requesterName: userName,
                    managerUserIds,
                } );
                if ( notificationDocs.length > 0 ) {
                    const serialized = notificationDocs.map( ( doc ) => serializeNotification( doc ) );
                    void broadcastNotifications( serialized );
                }
            } catch ( error ) {
                fastify.log.error( { err: error }, "Failed to broadcast join request notification" );
            }

            const response : JoinGroupResponse = {
                group: serializeGroup( group ),
                joined: false,
                requiresApproval: true,
                request: serializedRequest,
            };

            reply.code( 200 ).send( response );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/leave",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            const userId = request.user!.id;

            if ( group.ownerId === userId ) {
                reply.code( 400 ).send( { error: "cannot_leave_owned_group" } );
                return;
            }

            const nextMemberIds = group.memberIds.filter( ( id ) => id !== userId );

            if ( nextMemberIds.length === group.memberIds.length ) {
                reply.code( 200 ).send( {
                    group: serializeGroup( group ),
                    left: false,
                } );
                return;
            }

            group.memberIds = nextMemberIds;
            await group.save();

            reply.code( 200 ).send( {
                group: serializeGroup( group ),
                left: true,
            } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/requests/:requestId/approve",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParse = requestParamsSchema.safeParse( request.params );

            if ( !paramsParse.success ) {
                reply.code( 400 ).send( { error: "invalid_request_params" } );
                return;
            }

            const { groupId, requestId } = paramsParse.data;

            if ( !Types.ObjectId.isValid( groupId ) || !Types.ObjectId.isValid( requestId ) ) {
                reply.code( 400 ).send( { error: "invalid_request_params" } );
                return;
            }

            if ( !( await canManageJoinRequests( groupId, request.user!.id ) ) ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const joinRequest = await GroupJoinRequestModel.findOne( {
                _id: requestId,
                groupId,
            } ).exec();

            if ( !joinRequest ) {
                reply.code( 404 ).send( { error: "join_request_not_found" } );
                return;
            }

            if ( joinRequest.status !== "pending" ) {
                reply.code( 409 ).send( { error: "join_request_already_processed" } );
                return;
            }

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            if ( !group.memberIds.includes( joinRequest.userId ) ) {
                group.memberIds.push( joinRequest.userId );
                await group.save();
            }

            joinRequest.status = "approved" satisfies GroupJoinRequestStatus;
            joinRequest.processedBy = request.user!.id;
            joinRequest.processedAt = new Date();
            await joinRequest.save();

            const serializedRequest = serializeJoinRequest( joinRequest );

            try {
                const notificationDocs = await createGroupJoinDecisionNotification( {
                    requestId: serializedRequest.id,
                    groupId,
                    groupName: group.name,
                    requesterId: joinRequest.userId,
                    decision: "approved",
                    processedBy: request.user!.id,
                } );
                if ( notificationDocs.length > 0 ) {
                    const serialized = notificationDocs.map( ( doc ) => serializeNotification( doc ) );
                    void broadcastNotifications( serialized );
                }
            } catch ( error ) {
                fastify.log.error( { err: error }, "Failed to broadcast join approval notification" );
            }

            const response : ReviewJoinRequestResponse = {
                request: serializedRequest,
                group: serializeGroup( group ),
            };

            reply.code( 200 ).send( response );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/requests/:requestId/reject",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParse = requestParamsSchema.safeParse( request.params );

            if ( !paramsParse.success ) {
                reply.code( 400 ).send( { error: "invalid_request_params" } );
                return;
            }

            const { groupId, requestId } = paramsParse.data;

            if ( !Types.ObjectId.isValid( groupId ) || !Types.ObjectId.isValid( requestId ) ) {
                reply.code( 400 ).send( { error: "invalid_request_params" } );
                return;
            }

            if ( !( await canManageJoinRequests( groupId, request.user!.id ) ) ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const joinRequest = await GroupJoinRequestModel.findOne( {
                _id: requestId,
                groupId,
            } ).exec();

            if ( !joinRequest ) {
                reply.code( 404 ).send( { error: "join_request_not_found" } );
                return;
            }

            if ( joinRequest.status !== "pending" ) {
                reply.code( 409 ).send( { error: "join_request_already_processed" } );
                return;
            }

            joinRequest.status = "rejected" satisfies GroupJoinRequestStatus;
            joinRequest.processedBy = request.user!.id;
            joinRequest.processedAt = new Date();
            await joinRequest.save();

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            const serializedRequest = serializeJoinRequest( joinRequest );

            try {
                const notificationDocs = await createGroupJoinDecisionNotification( {
                    requestId: serializedRequest.id,
                    groupId,
                    groupName: group.name,
                    requesterId: joinRequest.userId,
                    decision: "rejected",
                    processedBy: request.user!.id,
                } );
                if ( notificationDocs.length > 0 ) {
                    const serialized = notificationDocs.map( ( doc ) => serializeNotification( doc ) );
                    void broadcastNotifications( serialized );
                }
            } catch ( error ) {
                fastify.log.error( { err: error }, "Failed to broadcast join rejection notification" );
            }

            const response : ReviewJoinRequestResponse = {
                request: serializedRequest,
                group: serializeGroup( group ),
            };

            reply.code( 200 ).send( response );
        },
    } );

    fastify.route( {
        method: "PATCH",
        url: "/api/groups/:groupId",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const bodyParseResult = updateGroupSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const updates = bodyParseResult.data;

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            if ( group.ownerId !== request.user!.id ) {
                reply.code( 403 ).send( { error: "group_update_forbidden" } );
                return;
            }

            if ( updates.name !== undefined ) {
                group.name = updates.name;
            }
            if ( updates.description !== undefined ) {
                group.description = updates.description ?? null;
            }
            if ( updates.color !== undefined ) {
                group.color = normalizeColor( updates.color );
            }

            await group.save();

            reply.code( 200 ).send( {
                group: serializeGroup( group ),
            } );
        },
    } );

    fastify.route( {
        method: "GET",
        url: "/api/groups/:groupId/roles",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const group = await GroupModel.findById( groupId ).exec();

            if ( !group ) {
                reply.code( 404 ).send( { error: "group_not_found" } );
                return;
            }

            if ( !group.memberIds.includes( request.user!.id ) ) {
                reply.code( 403 ).send( { error: "not_group_member" } );
                return;
            }

            const roles = await RoleService.getGroupRoles( groupId );
            const memberRoles = await RoleService.getGroupMemberRoles( groupId );

            const groupWithRoles : GroupWithRoles = {
                ...serializeGroup( group ),
                roles: roles.map( serializeGroupRole ),
                memberRoles: memberRoles.map( serializeGroupMemberRole ),
            };

            reply.code( 200 ).send( { group: groupWithRoles } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/roles",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const canManageRoles = await RoleService.hasPermission(
                groupId,
                request.user!.id,
                "manage_roles" as any
            );

            if ( !canManageRoles ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const createRoleSchema = z.object( {
                name: z.string().min( 1 ).max( 50 ),
                description: z.string().max( 200 ).optional(),
                color: colorSchema.optional(),
                permissions: z.array( z.string() ).min( 1 ),
            } );

            const bodyParseResult = createRoleSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const payload = bodyParseResult.data as CreateGroupRolePayload;

            const existingRoles = await RoleService.getGroupRoles( groupId );
            const nextPosition = Math.max( ...existingRoles.map( r => r.position ), 0 ) + 1;

            const created = await GroupRoleModel.create( {
                name: payload.name,
                description: payload.description ?? null,
                color: normalizeColor( payload.color ),
                permissions: payload.permissions as any[],
                position: nextPosition,
                groupId,
                isDefault: false,
            } );

            reply.code( 201 ).send( {
                role: serializeGroupRole( created ),
            } );
        },
    } );

    fastify.route( {
        method: "PATCH",
        url: "/api/groups/:groupId/roles/:roleId",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsSchema = z.object( {
                groupId: z.string().min( 1 ),
                roleId: z.string().min( 1 ),
            } );

            const paramsParseResult = paramsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_params" } );
                return;
            }

            const { groupId, roleId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) || !Types.ObjectId.isValid( roleId ) ) {
                reply.code( 400 ).send( { error: "invalid_id" } );
                return;
            }

            const canManageRole = await RoleService.canManageRole(
                groupId,
                request.user!.id,
                roleId
            );

            if ( !canManageRole ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const updateRoleSchema = z.object( {
                name: z.string().min( 1 ).max( 50 ).optional(),
                description: z.string().max( 200 ).optional(),
                color: colorSchema.optional(),
                permissions: z.array( z.string() ).min( 1 ).optional(),
            } );

            const bodyParseResult = updateRoleSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const updates = bodyParseResult.data as UpdateGroupRolePayload;

            const role = await GroupRoleModel.findOne( {
                _id: roleId,
                groupId,
            } ).exec();

            if ( !role ) {
                reply.code( 404 ).send( { error: "role_not_found" } );
                return;
            }

            if ( updates.name !== undefined ) {
                role.name = updates.name;
            }
            if ( updates.description !== undefined ) {
                role.description = updates.description ?? null;
            }
            if ( updates.color !== undefined ) {
                role.color = normalizeColor( updates.color );
            }
            if ( updates.permissions !== undefined ) {
                role.permissions = updates.permissions as any[];
            }

            await role.save();

            reply.code( 200 ).send( {
                role: serializeGroupRole( role ),
            } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/roles/assign",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const canManageRoles = await RoleService.hasPermission(
                groupId,
                request.user!.id,
                "manage_roles" as any
            );

            if ( !canManageRoles ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const assignRoleSchema = z.object( {
                userId: z.string().min( 1 ),
                roleId: z.string().min( 1 ),
            } );

            const bodyParseResult = assignRoleSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const payload = bodyParseResult.data as AssignRolePayload;

            const canManageTargetRole = await RoleService.canManageRole(
                groupId,
                request.user!.id,
                payload.roleId
            );

            if ( !canManageTargetRole ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            await RoleService.assignRole(
                groupId,
                payload.userId,
                payload.roleId,
                request.user!.id
            );

            reply.code( 200 ).send( { success: true } );
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/groups/:groupId/roles/remove",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const paramsParseResult = leaveGroupParamsSchema.safeParse( request.params );

            if ( !paramsParseResult.success ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const { groupId } = paramsParseResult.data;

            if ( !Types.ObjectId.isValid( groupId ) ) {
                reply.code( 400 ).send( { error: "invalid_group_id" } );
                return;
            }

            const canManageRoles = await RoleService.hasPermission(
                groupId,
                request.user!.id,
                "manage_roles" as any
            );

            if ( !canManageRoles ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            const removeRoleSchema = z.object( {
                userId: z.string().min( 1 ),
                roleId: z.string().min( 1 ),
            } );

            const bodyParseResult = removeRoleSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.code( 400 ).send( {
                    error: "invalid_body",
                    details: bodyParseResult.error.flatten(),
                } );
                return;
            }

            const payload = bodyParseResult.data as RemoveRolePayload;

            const canManageTargetRole = await RoleService.canManageRole(
                groupId,
                request.user!.id,
                payload.roleId
            );

            if ( !canManageTargetRole ) {
                reply.code( 403 ).send( { error: "insufficient_permissions" } );
                return;
            }

            await RoleService.removeRole(
                groupId,
                payload.userId,
                payload.roleId
            );

            reply.code( 200 ).send( { success: true } );
        },
    } );
}
const createInviteSchema = z.object( {
    email: z.string().email(),
    expiresInHours: z.number().int().min( 1 ).max( 720 ).optional(),
} );
