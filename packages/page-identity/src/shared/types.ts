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

type GlobalDocument = typeof globalThis extends { document: infer Doc } ? Doc : unknown;

export type CapturePageIdentityOptions = {
    currentUrl?: string;
    target?: GlobalDocument;
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
