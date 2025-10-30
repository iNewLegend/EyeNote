import type { FastifyInstance } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import type { NoteBase, NoteRecord, PageIdentityPayload } from "@eye-note/definitions";
import { NoteModel } from "../models/note";
import { GroupModel } from "../models/group";
import { resolvePageIdentity } from "../services/page-identity-service";

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

const groupIdSchema = z
    .union( [ z.string().min( 1 ), z.literal( "" ), z.null() ] )
    .optional();

const pageIdentitySchema = z.object( {
    canonicalUrl: z.string().optional(),
    normalizedUrl: z.string().min( 1 ),
    sourceUrl: z.string().optional(),
    contentSignature: z.string().min( 1 ),
    layoutSignature: z.string().min( 1 ),
    layoutTokens: z.array( z.string() ).default( [] ),
    textTokenSample: z.number().int().min( 0 ).default( 0 ),
    generatedAt: z.string().optional(),
} );

const anchorHintsSchema = z.object( {
    tagName: z.string().optional(),
    id: z.string().optional(),
    classListSample: z.array( z.string() ).optional(),
    dataAttrs: z.record( z.string() ).optional(),
    textHash: z.string().optional(),
} );

const notePayloadSchema = z.object( {
    elementPath: z.string().min( 1 ),
    content: z.string().default( "" ),
    url: z.string().url(),
    hostname: z.string().optional(),
    groupId: groupIdSchema,
    pageId: z.string().optional(),
    canonicalUrl: z.string().optional(),
    normalizedUrl: z.string().optional(),
    anchorHints: anchorHintsSchema.optional(),
    pageIdentity: pageIdentitySchema.optional(),
    elementRect: rectSchema.optional(),
    elementOffset: vectorSchema.optional(),
    scrollPosition: vectorSchema.optional(),
    locationCapturedAt: z.number().optional(),
} );

const noteUpdateSchema = notePayloadSchema.partial();

const noteQuerySchema = z.object( {
    url: z.string().url().optional(),
    hostname: z.string().optional(),
    pageId: z.string().optional(),
    normalizedUrl: z.string().optional(),
    groupIds: z
        .preprocess( ( value ) => {
            if ( Array.isArray( value ) ) {
                return value;
            }
            if ( typeof value === "string" ) {
                return [ value ];
            }
            return undefined;
        }, z.array( z.string() ).optional() )
        .optional(),
} );

const noteQueryBodySchema = noteQuerySchema.extend( {
    pageId: z.string().optional(),
    normalizedUrl: z.string().optional(),
    pageIdentity: pageIdentitySchema.optional(),
} );

type IncomingPageIdentityPayload = Omit<PageIdentityPayload, "generatedAt"> & {
    generatedAt ?: string;
};

function normalizePageIdentityPayload ( payload : IncomingPageIdentityPayload ) : PageIdentityPayload {
    return {
        ...payload,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
    };
}

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
        hostname: doc.hostname ?? null,
        pageId: doc.pageId ?? null,
        canonicalUrl: doc.canonicalUrl ?? null,
        normalizedUrl: doc.normalizedUrl ?? null,
        anchorHints: doc.anchorHints ?? undefined,
        groupId: doc.groupId ?? null,
        elementRect: doc.elementRect ?? undefined,
        elementOffset: doc.elementOffset ?? undefined,
        scrollPosition: doc.scrollPosition ?? undefined,
        locationCapturedAt: doc.locationCapturedAt ?? undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

function normalizeGroupId ( value : unknown ) : string | null | undefined {
    if ( value === undefined ) {
        return undefined;
    }
    if ( value === null ) {
        return null;
    }
    if ( typeof value !== "string" ) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}

function buildFilter ( params : {
    id ?: string;
    userId : string;
    hostname ?: string;
    url ?: string;
    urls ?: string[];
    normalizedUrl ?: string;
    normalizedUrls ?: string[];
    pageId ?: string;
    groupIds ?: string[];
} ) {
    const filter : Record<string, unknown> = {
        userId: params.userId,
    };

    if ( params.id ) {
        filter._id = new Types.ObjectId( params.id );
    }
    if ( params.pageId ) {
        filter.pageId = params.pageId;
    }
    if ( params.normalizedUrl && !params.pageId ) {
        if ( params.hostname ) {
            filter.hostname = params.hostname;
        }
        filter.normalizedUrl = params.normalizedUrl;
    }
    if ( params.normalizedUrls && params.normalizedUrls.length > 0 && !params.pageId ) {
        if ( params.hostname ) {
            filter.hostname = params.hostname;
        }
        filter.normalizedUrl = { $in: params.normalizedUrls };
    }
    // drop legacy url-only matching when we have normalized identity
    if ( params.url && !params.pageId && !params.normalizedUrl && !params.normalizedUrls ) {
        filter.url = params.url;
    }
    if ( params.groupIds ) {
        const trimmed = params.groupIds.map( ( id ) => id.trim() );

        if ( trimmed.length === 0 ) {
            filter._id = { $in: [] };
        } else {
            const includesUngrouped = trimmed.includes( "" );
            const explicitGroupIds = trimmed.filter( ( id ) => id !== "" );

            if ( includesUngrouped && explicitGroupIds.length > 0 ) {
                filter.$or = [
                    { groupId: null },
                    { groupId: { $in: explicitGroupIds } },
                ];
            } else if ( includesUngrouped ) {
                filter.groupId = null;
            } else if ( explicitGroupIds.length > 0 ) {
                filter.groupId = { $in: explicitGroupIds };
            } else {
                filter._id = { $in: [] };
            }
        }
    }
    return filter;
}

export async function notesRoutes ( fastify : FastifyInstance ) {
    fastify.route( {
        method: "POST",
        url: "/api/notes/query",
        preHandler: fastify.authenticate,
        handler: async ( request, reply ) => {
            const bodyParseResult = noteQueryBodySchema.safeParse( request.body );

            if ( !bodyParseResult.success ) {
                reply
                    .status( 400 )
                    .send( { error: "invalid_query", details: bodyParseResult.error.flatten() } );
                return;
            }

            const { url, hostname, groupIds, pageId, normalizedUrl, pageIdentity } = bodyParseResult.data;

            let resolvedPageId = pageId;
            let resolvedNormalizedUrl = normalizedUrl;
            const resolvedNormalizedUrls : string[] = [];
            let identityResolution = undefined;

            if ( pageIdentity ) {
                const normalizedIdentity = normalizePageIdentityPayload( pageIdentity );
                fastify.log.info( {
                    event: "notes.query.page-identity",
                    userId: request.user!.id,
                    pageIdentity: normalizedIdentity,
                }, "Resolving page identity for query" );
                const resolutionResult = await resolvePageIdentity( normalizedIdentity, { log: fastify.log } );
                identityResolution = resolutionResult.resolution;
                resolvedPageId = resolutionResult.document._id.toHexString();
                resolvedNormalizedUrl = resolutionResult.document.normalizedUrl ?? normalizedIdentity.normalizedUrl;
                if ( resolvedNormalizedUrl ) {
                    resolvedNormalizedUrls.push( resolvedNormalizedUrl );
                }
                if ( normalizedIdentity.normalizedUrl && !resolvedNormalizedUrls.includes( normalizedIdentity.normalizedUrl ) ) {
                    resolvedNormalizedUrls.push( normalizedIdentity.normalizedUrl );
                }
                fastify.log.info( {
                    event: "notes.query.page-identity.resolved",
                    userId: request.user!.id,
                    pageId: resolvedPageId,
                    normalizedUrl: resolvedNormalizedUrl,
                    identityResolution,
                }, "Resolved page identity for query" );
            }

            const filter = buildFilter( {
                userId: request.user!.id,
                hostname,
                groupIds,
                pageId: resolvedPageId,
                normalizedUrl: resolvedNormalizedUrl,
                normalizedUrls: resolvedNormalizedUrls,
            } );

            fastify.log.info( {
                event: "notes.query.filter",
                userId: request.user!.id,
                pageId: resolvedPageId,
                hostname,
                normalizedUrl: resolvedNormalizedUrl,
                normalizedUrls: resolvedNormalizedUrls,
                groupIds,
            }, "Querying notes with resolved filter" );

            let docs = await NoteModel.find( filter )
                .sort( { updatedAt: -1 } )
                .lean()
                .exec();

            // Fallback: if pageId query returned no docs (e.g., newly-created notes without pageId yet),
            // try composite (hostname, normalizedUrl/normalizedUrls)
            if ( docs.length === 0 ) {
                const fallbackHostname = hostname ?? ( () => {
                    try {
                        const raw = resolvedNormalizedUrl ?? url ?? pageIdentity?.normalizedUrl;
                        return raw ? new URL( raw ).hostname : undefined;
                    } catch { return undefined; }
                } )();

                if ( fallbackHostname && ( resolvedNormalizedUrl || resolvedNormalizedUrls.length > 0 ) ) {
                    const compositeFilter = buildFilter( {
                        userId: request.user!.id,
                        hostname: fallbackHostname,
                        normalizedUrl: resolvedNormalizedUrl,
                        normalizedUrls: resolvedNormalizedUrls,
                        groupIds,
                    } );

                    fastify.log.info( {
                        event: "notes.query.fallback-composite",
                        userId: request.user!.id,
                        hostname: fallbackHostname,
                        normalizedUrl: resolvedNormalizedUrl,
                        normalizedUrls: resolvedNormalizedUrls,
                    }, "Querying notes with composite key fallback" );

                    docs = await NoteModel.find( compositeFilter )
                        .sort( { updatedAt: -1 } )
                        .lean()
                        .exec();
                }
            }

            // No legacy backfill path by design (fresh dataset only)

            reply.send( {
                notes: docs.map( ( doc ) => serializeNote( doc as NoteLean ) ),
                identity: identityResolution,
            } );
        },
    } );

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

            const { url, groupIds, pageId, normalizedUrl } = queryParseResult.data;

            const docs = await NoteModel.find(
                buildFilter( {
                    userId: request.user!.id,
                    url,
                    groupIds,
                    pageId,
                    normalizedUrl,
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

            const { groupId, pageIdentity, pageId, canonicalUrl, normalizedUrl, ...rest } = bodyParseResult.data;
            const normalizedGroupId = normalizeGroupId( groupId );

            if ( typeof normalizedGroupId === "string" ) {
                if ( !Types.ObjectId.isValid( normalizedGroupId ) ) {
                    reply.status( 400 ).send( { error: "invalid_group_id" } );
                    return;
                }

                const hasAccess = await GroupModel.exists( {
                    _id: new Types.ObjectId( normalizedGroupId ),
                    memberIds: request.user!.id,
                } );

                if ( !hasAccess ) {
                    reply.status( 403 ).send( { error: "group_access_denied" } );
                    return;
                }
            }

            let resolvedPageId = pageId ?? null;
            let resolvedCanonicalUrl = canonicalUrl ?? null;
            let resolvedNormalizedUrl = normalizedUrl ?? null;
            let identityResolution = undefined;

            if ( pageIdentity ) {
                const normalizedIdentity = normalizePageIdentityPayload( pageIdentity );
                fastify.log.info( {
                    event: "notes.create.page-identity",
                    userId: request.user!.id,
                    pageIdentity: normalizedIdentity,
                }, "Resolving page identity for create" );
                const resolutionResult = await resolvePageIdentity( normalizedIdentity, { log: fastify.log } );
                identityResolution = resolutionResult.resolution;
                resolvedPageId = resolutionResult.document._id.toHexString();
                resolvedCanonicalUrl =
                    resolvedCanonicalUrl ??
                    resolutionResult.document.canonicalUrl ??
                    normalizedIdentity.canonicalUrl ??
                    null;
                resolvedNormalizedUrl =
                    resolvedNormalizedUrl ??
                    resolutionResult.document.normalizedUrl ??
                    normalizedIdentity.normalizedUrl ??
                    null;
                fastify.log.info( {
                    event: "notes.create.page-identity.resolved",
                    userId: request.user!.id,
                    pageId: resolvedPageId,
                    canonicalUrl: resolvedCanonicalUrl,
                    normalizedUrl: resolvedNormalizedUrl,
                    identityResolution,
                }, "Resolved page identity for create" );
            } else if ( pageId ) {
                // Accept creates that include an already-resolved pageId
                fastify.log.info( {
                    event: "notes.create.using-page-id",
                    userId: request.user!.id,
                    pageId,
                    url: rest.url,
                }, "Creating note using provided pageId" );
                resolvedPageId = pageId;
                resolvedNormalizedUrl = normalizedUrl ?? null;
                resolvedCanonicalUrl = canonicalUrl ?? null;
            } else {
                // Fallback: accept create using composite key when identity/pageId are absent
                const { hostname: incomingHostname } = rest as typeof rest & { hostname?: string | null };
                const parsed = ( () => { try { return new URL( rest.url ); } catch { return null; } } )();
                const fallbackHostname = incomingHostname ?? ( parsed ? parsed.hostname : null );
                // Normalize URL by dropping search/hash so it matches identity normalizedUrl
                const fallbackNormalizedUrl = ( () => {
                    if ( normalizedUrl ) return normalizedUrl;
                    if ( parsed ) return `${ parsed.origin }${ parsed.pathname }`;
                    return rest.url;
                } )();

                fastify.log.info( {
                    event: "notes.create.fallback-composite",
                    userId: request.user!.id,
                    url: rest.url,
                    hostname: fallbackHostname,
                    normalizedUrl: fallbackNormalizedUrl,
                }, "Creating note using (hostname, normalizedUrl) composite" );

                resolvedPageId = null;
                resolvedCanonicalUrl = canonicalUrl ?? null;
                resolvedNormalizedUrl = fallbackNormalizedUrl;

                // Attach hostname into rest-like payload below via explicit field
                ( rest as any ).hostname = fallbackHostname; // attached explicitly at creation
            }

            const { hostname: incomingHostname, ...restWithoutHostname } = rest as typeof rest & { hostname?: string | null };
            const hostname = incomingHostname ?? ( () => { try { return new URL( rest.url ).hostname; } catch { return null; } } )();

            const created = await NoteModel.create( {
                userId: request.user!.id,
                ...restWithoutHostname,
                hostname,
                groupId: normalizedGroupId ?? null,
                pageId: resolvedPageId,
                canonicalUrl: resolvedCanonicalUrl,
                normalizedUrl: resolvedNormalizedUrl,
            } );

            const note = created.toObject() as NoteLean;

            reply.code( 201 );
            return {
                note: serializeNote( note ),
                identity: identityResolution,
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

            const updates = bodyParseResult.data;

            const updateDoc : Record<string, unknown> = {
                updatedAt: new Date(),
            };

            for ( const [ key, value ] of Object.entries( updates ) ) {
                if ( key === "groupId" ) {
                    const normalized = normalizeGroupId( value );
                    if ( normalized !== undefined ) {
                        if ( typeof normalized === "string" ) {
                            if ( !Types.ObjectId.isValid( normalized ) ) {
                                reply.status( 400 ).send( { error: "invalid_group_id" } );
                                return;
                            }

                            const hasAccess = await GroupModel.exists( {
                                _id: new Types.ObjectId( normalized ),
                                memberIds: request.user!.id,
                            } );

                            if ( !hasAccess ) {
                                reply.status( 403 ).send( { error: "group_access_denied" } );
                                return;
                            }
                        }

                        updateDoc.groupId = normalized;
                    }
                    return;
                }

                if ( value !== undefined ) {
                    updateDoc[ key ] = value;
                }
            }

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
