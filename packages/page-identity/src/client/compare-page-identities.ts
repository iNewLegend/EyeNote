import { compareIdentities } from "@eye-note/page-identity/src/shared/similarity";

import type { IdentityComparisonOptions, IdentityComparisonResult, PageIdentity } from "@eye-note/page-identity/src/shared/types";

export function comparePageIdentities (
    previousIdentity : PageIdentity,
    nextIdentity : PageIdentity,
    options ?: IdentityComparisonOptions
) : IdentityComparisonResult {
    return compareIdentities( previousIdentity, nextIdentity, options );
}
