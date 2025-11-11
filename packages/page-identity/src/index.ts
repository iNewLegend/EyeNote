/* eslint-disable no-restricted-imports */

export type {
    PageIdentity,
    IdentityComparisonOptions,
    IdentityComparisonResult,
    CapturePageIdentityOptions,
    PageIdentityCandidate,
    RankedIdentityMatch,
} from "./shared/types";

export { compareIdentities } from "./shared/similarity";
export { normalizeUrl } from "./shared/url";
export { hammingDistance, jaccardIndex } from "./shared/similarity";

export { capturePageIdentity } from "./client/capture-page-identity";
export { comparePageIdentities } from "./client/compare-page-identities";

export { rankIdentityMatches } from "./server/rank-identity-matches";
