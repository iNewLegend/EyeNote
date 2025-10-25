import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import type {
    CreateGroupPayload,
    GroupRecord,
    JoinGroupPayload,
    ListGroupsResponse,
} from "@eye-note/definitions";
import type { FastifyInstance } from "fastify";
import { GroupModel, type GroupDocument } from "../models/group";

const createGroupSchema = z.object( {
    name: z.string().min( 1 ).max( 80 ),
    description: z.string().max( 280 ).optional(),
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
        memberCount: doc.memberIds.length,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
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

            const created = await GroupModel.create( {
                name: payload.name,
                description: payload.description ?? null,
                slug,
                inviteCode,
                ownerId: request.user!.id,
                memberIds: [ request.user!.id ],
            } );

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
}
