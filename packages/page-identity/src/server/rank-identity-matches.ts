import type {
    IdentityComparisonOptions,
    PageIdentity,
    PageIdentityCandidate,
    RankedIdentityMatch,
} from "../shared/types";
import { compareIdentities } from "../shared/similarity";
import { DEFAULT_MAX_CONTENT_DISTANCE } from "../shared/constants";

export function rankIdentityMatches (
    fingerprint : PageIdentity,
    candidates : PageIdentityCandidate[],
    options ?: IdentityComparisonOptions
) : RankedIdentityMatch[] {
    const assessments = candidates.map<RankedIdentityMatch>( ( candidate ) => {
        const comparison = compareIdentities( fingerprint, candidate.identity, options );

        const maxDistance = options?.maxContentDistance ?? DEFAULT_MAX_CONTENT_DISTANCE;
        const contentScore = Math.max( 0, 1 - comparison.contentDistance / ( maxDistance + 1 ) );
        const layoutScore = comparison.layoutSimilarity;
        const canonicalScore = comparison.canonicalMatch ? 1 : 0;

        const score = canonicalScore * 0.4 + layoutScore * 0.4 + contentScore * 0.2;

        return {
            id: candidate.id,
            isMatch: comparison.isMatch,
            score,
            comparison,
        };
    } );

    return assessments.sort( ( left, right ) => right.score - left.score );
}
