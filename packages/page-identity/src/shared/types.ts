export type PageIdentity = {
    canonicalUrl?: string;
    normalizedUrl: string;
    sourceUrl?: string;
    contentSignature: string;
    layoutSignature: string;
    layoutTokens: string[];
    textTokenSample: number;
    generatedAt: string;
};

export type IdentityComparisonOptions = {
    maxContentDistance?: number;
    minLayoutSimilarity?: number;
    requireCanonicalAgreement?: boolean;
};

export type IdentityComparisonResult = {
    isMatch: boolean;
    canonicalMatch: boolean;
    contentDistance: number;
    layoutSimilarity: number;
    reason: string[];
};

export type CapturePageIdentityOptions = {
    currentUrl?: string;
    target?: Document;
    tokenLimit?: number;
    nodeSampleLimit?: number;
    ignoreQueryParams?: string[];
    stripHash?: boolean;
};

export type PageIdentityCandidate = {
    id: string;
    identity: PageIdentity;
};

export type RankedIdentityMatch = {
    id: string;
    isMatch: boolean;
    score: number;
    comparison: IdentityComparisonResult;
};
