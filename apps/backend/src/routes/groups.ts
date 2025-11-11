import { randomBytes } from "node:crypto";

import { Types } from "mongoose";
import { z } from "zod";

import { RoleService } from "@eye-note/backend/src/services/role-service";

import { GroupModel  } from "@eye-note/backend/src/models/group";

import { GroupRoleModel  } from "@eye-note/backend/src/models/group-role";

import type { GroupDocument } from "@eye-note/backend/src/models/group";
import type { GroupMemberRoleDocument } from "@eye-note/backend/src/models/group-member-role";
import type { GroupRoleDocument } from "@eye-note/backend/src/models/group-role";

import type { FastifyInstance } from "fastify";
import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    ListGroupsResponse,
    GroupWithRoles,
    CreateGroupRolePayload,
    UpdateGroupRolePayload,
    AssignRolePayload,
    RemoveRolePayload,
} from "@eye-note/definitions";

const DEFAULT_GROUP_COLOR = "#6366f1";

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

function serializeGroup ( doc : GroupDocument ) : GroupRecord {
    return {
        id: doc._id.toHexString(),
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
                groups: groups.map( ( group : GroupDocument ) => serializeGroup( group ) ),
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

            await RoleService.createDefaultRoles( created._id.toHexString(), request.user!.id );

            reply.code( 201 ).send( {
                group: serializeGroup( created ),
            } );
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

            if ( group.memberIds.includes( userId ) ) {
                reply.code( 200 ).send( {
                    group: serializeGroup( group ),
                    joined: false,
                } );
                return;
            }

            group.memberIds.push( userId );
            await group.save();

            reply.code( 200 ).send( {
                group: serializeGroup( group ),
                joined: true,
            } );
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

            const nextMemberIds = group.memberIds.filter( ( id : string ) => id !== userId );

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
            const nextPosition = Math.max( ...existingRoles.map( ( r : GroupRoleDocument ) => r.position ), 0 ) + 1;

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
