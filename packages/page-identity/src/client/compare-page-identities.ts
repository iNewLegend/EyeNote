import type { IdentityComparisonOptions, IdentityComparisonResult, PageIdentity } from "../shared/types";
import { compareIdentities } from "../shared/similarity";

export function comparePageIdentities (
    previousIdentity : PageIdentity,
    nextIdentity : PageIdentity,
    options ?: IdentityComparisonOptions
) : IdentityComparisonResult {
    return compareIdentities( previousIdentity, nextIdentity, options );
}
