import type { PageIdentityPayload, PageIdentityResolution } from "@eye-note/definitions";
import { rankIdentityMatches } from "@eye-note/page-identity/server";
import type { FastifyBaseLogger } from "fastify";
import { PageIdentityModel, type PageIdentityDocument } from "../models/page-identity";

type ResolveResult = {
    document : PageIdentityDocument;
    resolution : PageIdentityResolution;
};

function mapDocumentToIdentityPayload ( doc : PageIdentityDocument ) : PageIdentityPayload {
    return {
        canonicalUrl: doc.canonicalUrl ?? undefined,
        normalizedUrl: doc.normalizedUrl,
        sourceUrl: doc.sourceUrls[ doc.sourceUrls.length - 1 ],
        contentSignature: doc.contentSignature,
        layoutSignature: doc.layoutSignature,
        layoutTokens: doc.layoutTokens,
        textTokenSample: doc.textTokenSample,
        generatedAt: doc.updatedAt.toISOString(),
    };
}

function buildResolution (
    matched : boolean,
    pageId : string,
    confidence : number,
    canonicalMatch : boolean,
    reasons : string[]
) : PageIdentityResolution {
    return {
        pageId,
        matched,
        confidence,
        canonicalMatch,
        reasons,
    };
}

function buildUpdateFromPayload ( payload : PageIdentityPayload, doc : PageIdentityDocument ) {
    const update : Partial<PageIdentityDocument> & { lastSeenAt : Date } = {
        lastSeenAt: new Date(),
    };

    if ( payload.normalizedUrl && payload.normalizedUrl !== doc.normalizedUrl ) {
        update.normalizedUrl = payload.normalizedUrl;
    }

    if ( payload.canonicalUrl && payload.canonicalUrl !== doc.canonicalUrl ) {
        update.canonicalUrl = payload.canonicalUrl;
    }

    update.contentSignature = payload.contentSignature;
    update.layoutSignature = payload.layoutSignature;
    update.layoutTokens = payload.layoutTokens.slice( 0, 80 );
    update.textTokenSample = payload.textTokenSample;

    if ( payload.sourceUrl ) {
        const existingSources = doc.sourceUrls ?? [];
        if ( !existingSources.includes( payload.sourceUrl ) ) {
            update.sourceUrls = [ ...existingSources.slice( -9 ), payload.sourceUrl ];
        }
    }

    return update;
}

export async function resolvePageIdentity (
    payload : PageIdentityPayload,
    context : { log : FastifyBaseLogger }
) : Promise<ResolveResult> {
    context.log.info( {
        event: "page-identity.resolve.start",
        payload,
    }, "Resolving page identity" );
    const candidates = await PageIdentityModel.find( {
        $or: [
            { normalizedUrl: payload.normalizedUrl },
            ...( payload.canonicalUrl ? [ { canonicalUrl: payload.canonicalUrl } ] : [] ),
        ],
    } )
        .sort( { updatedAt: -1 } )
        .exec();

    let bestMatchDocument : PageIdentityDocument | undefined;
    let bestMatchScore = 0;
    let canonicalMatch = false;
    let reasons : string[] = [];

    if ( candidates.length > 0 ) {
        const ranked = rankIdentityMatches(
            payload,
            candidates.map( ( doc ) => ( {
                id: doc._id.toHexString(),
                identity: mapDocumentToIdentityPayload( doc ),
            } ) )
        );

        if ( ranked.length > 0 ) {
            const topMatch = ranked[ 0 ];
            context.log.info( {
                event: "page-identity.resolve.candidates",
                candidateCount: candidates.length,
                ranked: ranked.slice( 0, 3 ),
            }, "Ranked page identity candidates" );

            if ( topMatch.isMatch ) {
                bestMatchDocument = candidates.find(
                    ( doc ) => doc._id.toHexString() === topMatch.id
                );

                bestMatchScore = topMatch.score;
                canonicalMatch = topMatch.comparison.canonicalMatch;
                reasons = topMatch.comparison.reason;
            }
        }
    }

    if ( bestMatchDocument ) {
        const update = buildUpdateFromPayload( payload, bestMatchDocument );
        await PageIdentityModel.updateOne(
            { _id: bestMatchDocument._id },
            {
                $set: update,
            }
        ).exec();

        const refreshed = await PageIdentityModel.findById( bestMatchDocument._id ).exec();
        const effectiveDoc = refreshed ?? bestMatchDocument;

        const resolution = buildResolution(
            true,
            effectiveDoc._id.toHexString(),
            bestMatchScore,
            canonicalMatch,
            reasons.length > 0 ? reasons : [ "similarity-match" ]
        );

        context.log.info( {
            event: "page-identity.resolve.match",
            pageId: effectiveDoc._id.toHexString(),
            normalizedUrl: effectiveDoc.normalizedUrl,
            canonicalUrl: effectiveDoc.canonicalUrl,
            reasons,
            score: bestMatchScore,
        }, "Resolved page identity to existing document" );

        return {
            document: effectiveDoc,
            resolution,
        };
    }

    const created = await PageIdentityModel.create( {
        normalizedUrl: payload.normalizedUrl,
        canonicalUrl: payload.canonicalUrl ?? null,
        contentSignature: payload.contentSignature,
        layoutSignature: payload.layoutSignature,
        layoutTokens: payload.layoutTokens.slice( 0, 80 ),
        textTokenSample: payload.textTokenSample,
        sourceUrls: payload.sourceUrl ? [ payload.sourceUrl ] : [],
        lastSeenAt: new Date(),
    } );

    const resolution = buildResolution(
        false,
        created._id.toHexString(),
        1,
        false,
        [ "new-page-identity" ]
    );

    context.log.info( {
        event: "page-identity.resolve.created",
        pageId: created._id.toHexString(),
        normalizedUrl: created.normalizedUrl,
        canonicalUrl: created.canonicalUrl,
    }, "Created new page identity document" );

    return {
        document: created,
        resolution,
    };
}
