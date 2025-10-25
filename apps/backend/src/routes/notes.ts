import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import type {
    CreateNotePayload,
    NoteBase,
    NoteRecord,
    UpdateNotePayload,
} from "@eye-note/definitions";
import { NoteModel } from "../models/note";

const vectorSchema = z.object( {
    x: z.number(),
    y: z.number(),
} );

const rectSchema = z.object( {
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
} );

const notePayloadSchema = z.object( {
    elementPath: z.string().min( 1 ),
    content: z.string().default( "" ),
    url: z.string().url(),
    groupId: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    elementRect: rectSchema.optional(),
    elementOffset: vectorSchema.optional(),
    elementOffsetRatio: vectorSchema.optional(),
    scrollPosition: vectorSchema.optional(),
    locationCapturedAt: z.number().optional(),
} );

const noteUpdateSchema = notePayloadSchema.partial();

const noteQuerySchema = z.object( {
    url: z.string().url().optional(),
    groupId: z.string().optional(),
} );

type NoteLean = NoteBase & {
    _id : Types.ObjectId;
    userId : string;
    createdAt : Date;
    updatedAt : Date;
};

function serializeNote ( doc : NoteLean ) : NoteRecord {
    return {
        id: doc._id.toHexString(),
        elementPath: doc.elementPath,
        content: doc.content,
        url: doc.url,
        groupId: doc.groupId ?? "",
        x: doc.x ?? undefined,
        y: doc.y ?? undefined,
        elementRect: doc.elementRect ?? undefined,
        elementOffset: doc.elementOffset ?? undefined,
        elementOffsetRatio: doc.elementOffsetRatio ?? undefined,
        scrollPosition: doc.scrollPosition ?? undefined,
        locationCapturedAt: doc.locationCapturedAt ?? undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function buildFilter ( params : { id ?: string; userId : string; url ?: string; groupId ?: string } ) {
    const filter : Record<string, unknown> = {
        userId: params.userId,
    };

    if ( params.id ) {
        filter._id = new Types.ObjectId( params.id );
    }
    if ( params.url ) {
        filter.url = params.url;
    }
    if ( params.groupId ) {
        filter.groupId = params.groupId;
    }
    return filter;
}

export async function notesRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "GET",
        url: "/api/notes",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const queryParseResult = noteQuerySchema.safeParse( request.query );

            if ( !queryParseResult.success ) {
                reply.status( 400 ).send( { error: "invalid_query", details: queryParseResult.error.flatten() } );
                return;
            }

            const { url, groupId } = queryParseResult.data;

            const docs = await NoteModel.find(
                buildFilter( {
                    userId: request.user!.id,
                    url,
                    groupId,
                } )
            )
                .sort( { updatedAt: -1 } )
                .lean()
                .exec();

            return {
                notes: docs.map( ( doc ) => serializeNote( doc as NoteLean ) ),
            };
        },
    } );

    fastify.route( {
        method: "POST",
        url: "/api/notes",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const bodyParseResult = notePayloadSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.status( 400 ).send( { error: "invalid_body", details: bodyParseResult.error.flatten() } );
                return;
            }

            const payload = bodyParseResult.data as CreateNotePayload;

            const created = await NoteModel.create( {
                userId: request.user!.id,
                ...payload,
            } );

            const note = created.toObject() as NoteLean;

            reply.code( 201 );
            return {
                note: serializeNote( note ),
            };
        },
    } );

    fastify.route( {
        method: "PUT",
        url: "/api/notes/:id",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const { id } = request.params as { id : string };

            if ( !Types.ObjectId.isValid( id ) ) {
                reply.status( 400 ).send( { error: "invalid_note_id" } );
                return;
            }

            const bodyParseResult = noteUpdateSchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply.status( 400 ).send( { error: "invalid_body", details: bodyParseResult.error.flatten() } );
                return;
            }

            const updates = bodyParseResult.data as UpdateNotePayload;

            const updateDoc : Record<string, unknown> = {
                updatedAt: new Date(),
            };

            ( Object.keys( updates ) as ( keyof UpdateNotePayload )[] ).forEach( ( key ) => {
                const value = updates[ key ];
                if ( value !== undefined ) {
                    updateDoc[ key ] = value;
                }
            } );

            const updated = await NoteModel.findOneAndUpdate(
                buildFilter( {
                    id,
                    userId: request.user!.id,
                } ),
                { $set: updateDoc },
                {
                    new: true,
                    lean: true,
                }
            ).exec();

            if ( !updated ) {
                reply.status( 404 ).send( { error: "note_not_found" } );
                return;
            }

            return {
                note: serializeNote( updated as NoteLean ),
            };
        },
    } );

    fastify.route( {
        method: "DELETE",
        url: "/api/notes/:id",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const { id } = request.params as { id : string };

            if ( !Types.ObjectId.isValid( id ) ) {
                reply.status( 400 ).send( { error: "invalid_note_id" } );
                return;
            }

            const result = await NoteModel.deleteOne(
                buildFilter( {
                    id,
                    userId: request.user!.id,
                } )
            ).exec();

            if ( result.deletedCount === 0 ) {
                reply.status( 404 ).send( { error: "note_not_found" } );
                return;
            }

            reply.code( 204 ).send();
        },
    } );
}
