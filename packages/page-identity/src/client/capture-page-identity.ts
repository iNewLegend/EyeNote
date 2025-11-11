import { DEFAULT_NODE_SAMPLE_LIMIT, DEFAULT_TOKEN_LIMIT } from "@eye-note/page-identity/src/shared/constants";
import { simHash } from "@eye-note/page-identity/src/shared/hash";

import { normalizeUrl } from "@eye-note/page-identity/src/shared/url";

import type { CapturePageIdentityOptions, PageIdentity } from "@eye-note/page-identity/src/shared/types";

export async function capturePageIdentity (
    options : CapturePageIdentityOptions = {}
) : Promise<PageIdentity> {
    const targetDocument = options.target ?? ( typeof document !== "undefined" ? document : undefined );

    if ( ! targetDocument ) {
        throw new Error( "[page-identity] capturePageIdentity requires a DOM Document" );
    }

    await waitForIdle();

    const canonicalUrl = readCanonicalUrl( targetDocument );
    const sourceUrl = options.currentUrl ?? getDocumentUrl( targetDocument );
    const normalizedUrl = normalizeUrl(
        canonicalUrl ?? sourceUrl,
        {
            ignoreQueryParams: options.ignoreQueryParams,
            stripHash: options.stripHash,
        }
    );

    const tokenLimit = options.tokenLimit ?? DEFAULT_TOKEN_LIMIT;
    const nodeSampleLimit = options.nodeSampleLimit ?? DEFAULT_NODE_SAMPLE_LIMIT;

    const textTokens = collectTextTokens( targetDocument, tokenLimit, nodeSampleLimit );
    const layoutTokens = collectLayoutTokens( targetDocument, nodeSampleLimit );

    const contentSignature = simHash( textTokens ).toString();
    const layoutSignature = simHash( layoutTokens ).toString();

    return {
        canonicalUrl,
        normalizedUrl,
        sourceUrl,
        contentSignature,
        layoutSignature,
        layoutTokens,
        textTokenSample: textTokens.length,
        generatedAt: new Date().toISOString(),
    };
}

function waitForIdle () : Promise<void> {
    if ( typeof window === "undefined" || typeof window.requestIdleCallback !== "function" ) {
        return Promise.resolve();
    }

    return new Promise( ( resolve ) => {
        window.requestIdleCallback( () => resolve(), { timeout: 200 } );
    } );
}

function readCanonicalUrl ( targetDocument : Document ) : string | undefined {
    const canonical =
        targetDocument.querySelector<HTMLLinkElement>( "link[rel='canonical']" ) ??
        targetDocument.querySelector<HTMLMetaElement>( "meta[property='og:url']" );

    const href = canonical?.getAttribute( "href" );

    if ( typeof href === "string" && href.trim().length > 0 ) {
        return href.trim();
    }

    const dataPageId = targetDocument.body?.getAttribute( "data-page-id" );
    if ( dataPageId && dataPageId.trim().length > 0 ) {
        return dataPageId.trim();
    }

    return undefined;
}

function getDocumentUrl ( targetDocument : Document ) : string {
    if ( typeof targetDocument.location?.href === "string" ) {
        return targetDocument.location.href;
    }

    return "";
}

function collectTextTokens (
    targetDocument : Document,
    tokenLimit : number,
    nodeSampleLimit : number
) : string[] {
    const tokens : string[] = [];
    const roots = pickContentRoots( targetDocument );

    let processedNodes = 0;

    for ( const root of roots ) {
        const walker = targetDocument.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode ( node ) {
                    if ( processedNodes >= nodeSampleLimit ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const parent = node.parentElement;
                    if ( ! parent ) {
                        return NodeFilter.FILTER_SKIP;
                    }

                    if ( shouldSkipElement( parent ) ) {
                        return NodeFilter.FILTER_SKIP;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                },
            }
        );

        let current = walker.nextNode();

        while ( current ) {
            processedNodes += 1;

            const textContent = current.textContent ?? "";
            const textTokens = tokenizeText( textContent );

            for ( const token of textTokens ) {
                if ( tokens.length >= tokenLimit ) {
                    return tokens;
                }
                tokens.push( token );
            }

            if ( tokens.length >= tokenLimit ) {
                return tokens;
            }

            current = walker.nextNode();
        }

        if ( tokens.length >= tokenLimit ) {
            break;
        }
    }

    return tokens;
}

function collectLayoutTokens ( targetDocument : Document, nodeSampleLimit : number ) : string[] {
    const tokens : string[] = [];
    const roots = pickContentRoots( targetDocument );

    let processedNodes = 0;

    for ( const root of roots ) {
        const walker = targetDocument.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode ( node ) {
                    if ( processedNodes >= nodeSampleLimit ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if ( shouldSkipElement( node instanceof Element ? node : null ) ) {
                        return NodeFilter.FILTER_SKIP;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                },
            }
        );

        let current = walker.nextNode();

        while ( current ) {
            if ( ! ( current instanceof Element ) ) {
                current = walker.nextNode();
                continue;
            }

            processedNodes += 1;

            tokens.push( serializeElementSignature( current ) );

            if ( tokens.length >= nodeSampleLimit ) {
                return tokens;
            }

            current = walker.nextNode();
        }

        if ( tokens.length >= nodeSampleLimit ) {
            break;
        }
    }

    return tokens;
}

function pickContentRoots ( targetDocument : Document ) : Element[] {
    const preferred = targetDocument.querySelectorAll<HTMLElement>(
        "main, [role='main'], article"
    );

    if ( preferred.length > 0 ) {
        return Array.from( preferred );
    }

    return targetDocument.body ? [ targetDocument.body ] : [];
}

function shouldSkipElement ( element : Element | null ) : boolean {
    if ( ! element ) {
        return true;
    }

    const tag = element.tagName.toLowerCase();

    if (
        tag === "script" ||
        tag === "style" ||
        tag === "noscript" ||
        tag === "svg" ||
        tag === "canvas" ||
        tag === "img" ||
        tag === "video" ||
        tag === "audio"
    ) {
        return true;
    }

    if ( element.hasAttribute( "aria-hidden" ) && element.getAttribute( "aria-hidden" ) === "true" ) {
        return true;
    }

    return false;
}

function tokenizeText ( input : string ) : string[] {
    return input
        .toLowerCase()
        .replace( /[^a-z0-9\s]+/g, " " )
        .split( /\s+/ )
        .map( ( token ) => token.trim() )
        .filter( ( token ) => token.length > 2 );
}

function serializeElementSignature ( element : Element ) : string {
    const parts : string[] = [];
    const tag = element.tagName.toLowerCase();

    parts.push( tag );

    const role = element.getAttribute( "role" );
    if ( role ) {
        parts.push( `role=${ role }` );
    }

    if ( element.id ) {
        parts.push( `#${ element.id }` );
    }

    const classTokens = Array.from( element.classList ).slice( 0, 3 );
    if ( classTokens.length > 0 ) {
        parts.push( `.${ classTokens.join( "." ) }` );
    }

    const dataView = element.getAttribute( "data-view" );
    if ( dataView ) {
        parts.push( `data-view=${ dataView }` );
    }

    const dataPage = element.getAttribute( "data-page-id" );
    if ( dataPage ) {
        parts.push( `data-page=${ dataPage }` );
    }

    return parts.join( "|" );
}
