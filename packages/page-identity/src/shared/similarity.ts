import type { IdentityComparisonOptions, IdentityComparisonResult, PageIdentity } from "./types";
import { DEFAULT_MAX_CONTENT_DISTANCE, DEFAULT_MIN_LAYOUT_SIMILARITY } from "./constants";

function toBigInt ( value : bigint | string ) : bigint {
    if ( typeof value === "bigint" ) {
        return value;
    }

    if ( value.trim().startsWith( "0x" ) || value.trim().startsWith( "0X" ) ) {
        return BigInt( value );
    }

    return BigInt( value );
}

export function hammingDistance ( a : bigint | string, b : bigint | string ) : number {
    let value = toBigInt( a ) ^ toBigInt( b );
    let count = 0;

    while ( value ) {
        value &= value - 1n;
        count += 1;
    }

    return count;
}

export function jaccardIndex ( first : Iterable<string>, second : Iterable<string> ) : number {
    const aSet = new Set( first );
    const bSet = new Set( second );

    if ( aSet.size === 0 && bSet.size === 0 ) {
        return 1;
    }

    let intersection = 0;

    for ( const token of aSet ) {
        if ( bSet.has( token ) ) {
            intersection += 1;
        }
    }

    const union = new Set( [ ...aSet, ...bSet ] );

    return intersection / union.size;
}

export function compareIdentities (
    subject : PageIdentity,
    candidate : PageIdentity,
    options : IdentityComparisonOptions = {}
) : IdentityComparisonResult {
    const {
        maxContentDistance = DEFAULT_MAX_CONTENT_DISTANCE,
        minLayoutSimilarity = DEFAULT_MIN_LAYOUT_SIMILARITY,
        requireCanonicalAgreement = false,
    } = options;

    const canonicalMatch =
        !!subject.canonicalUrl &&
        !!candidate.canonicalUrl &&
        subject.canonicalUrl === candidate.canonicalUrl;

    const contentDistance = hammingDistance(
        subject.contentSignature,
        candidate.contentSignature
    );

    const layoutSimilarity = jaccardIndex( subject.layoutTokens, candidate.layoutTokens );

    const reasons : string[] = [];

    if ( canonicalMatch ) {
        reasons.push( "canonical-url-match" );
    }

    if ( contentDistance <= maxContentDistance ) {
        reasons.push( "content-similarity" );
    }

    if ( layoutSimilarity >= minLayoutSimilarity ) {
        reasons.push( "layout-similarity" );
    }

    const isMatch =
        canonicalMatch ||
        ( contentDistance <= maxContentDistance && layoutSimilarity >= minLayoutSimilarity );

    const canonicalRequired = requireCanonicalAgreement ? canonicalMatch : true;

    return {
        isMatch: isMatch && canonicalRequired,
        canonicalMatch,
        contentDistance,
        layoutSimilarity,
        reason: reasons,
    };
}
