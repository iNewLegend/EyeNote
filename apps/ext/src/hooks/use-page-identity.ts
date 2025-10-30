import { useEffect, useRef, useState } from "react";
import {
    capturePageIdentity,
    comparePageIdentities,
    type IdentityComparisonResult,
    type PageIdentity,
} from "@eye-note/page-identity";

type PageIdentityState = {
    identity?: PageIdentity;
    previousIdentity?: PageIdentity;
    lastComparison?: IdentityComparisonResult;
    isLoading: boolean;
    error?: Error;
};

export function usePageIdentity ( currentUrl : string ) : PageIdentityState {
    const [ identity, setIdentity ] = useState<PageIdentity>();
    const [ previousIdentity, setPreviousIdentity ] = useState<PageIdentity>();
    const [ lastComparison, setLastComparison ] = useState<IdentityComparisonResult>();
    const [ isLoading, setIsLoading ] = useState( false );
    const [ error, setError ] = useState<Error>();

    const identityRef = useRef<PageIdentity>();
    const prevUrlRef = useRef<string>();
    const requestIdRef = useRef( 0 );

    useEffect( () => {
        if ( typeof window === "undefined" ) {
            return;
        }

        const isUrlChange = prevUrlRef.current !== currentUrl;
        prevUrlRef.current = currentUrl;

        const previous = isUrlChange ? undefined : identityRef.current;
        if ( isUrlChange ) {
            identityRef.current = undefined;
            setIdentity( undefined );
            setLastComparison( undefined );
        }

        setPreviousIdentity( previous );
        setIsLoading( true );
        setError( undefined );

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const run = async () => {
            console.debug( "[EyeNote] Page identity evaluation start", {
                currentUrl,
                hasExistingIdentity: Boolean( previous ),
            } );

            try {
                await new Promise<void>( ( resolve ) => {
                    if ( document.readyState === "complete" || document.readyState === "interactive" ) {
                        resolve();
                        return;
                    }
                    const onReady = () => {
                        document.removeEventListener( "DOMContentLoaded", onReady );
                        resolve();
                    };
                    document.addEventListener( "DOMContentLoaded", onReady );
                } );

                const freshIdentity = await capturePageIdentity( {
                    currentUrl,
                    target: typeof document !== "undefined" ? document : undefined,
                } );

                if ( requestId !== requestIdRef.current ) {
                    return;
                }

                console.debug( "[EyeNote] Page identity capture success", {
                    currentUrl,
                    freshIdentity,
                } );

                let comparison : IdentityComparisonResult | undefined;
                let nextIdentity = freshIdentity;

                if ( previous ) {
                    comparison = comparePageIdentities( previous, freshIdentity );

                    if ( comparison.isMatch ) {
                        nextIdentity = {
                            ...previous,
                            canonicalUrl: previous.canonicalUrl ?? freshIdentity.canonicalUrl,
                            layoutSignature: freshIdentity.layoutSignature,
                            layoutTokens: freshIdentity.layoutTokens,
                            textTokenSample: freshIdentity.textTokenSample,
                            generatedAt: freshIdentity.generatedAt,
                        };
                    }
                }

                identityRef.current = nextIdentity;
                setIdentity( nextIdentity );
                setLastComparison( comparison );
            } catch ( cause ) {
                if ( requestId !== requestIdRef.current ) {
                    return;
                }

                const error =
                    cause instanceof Error ? cause : new Error( "Failed to capture page identity" );

                console.error( "[EyeNote] Page identity capture failed", {
                    currentUrl,
                    error,
                } );

                setError( error );
            } finally {
                if ( requestId === requestIdRef.current ) {
                    setIsLoading( false );
                }
            }
        };

        run();

        return () => {
            if ( requestId === requestIdRef.current ) {
                requestIdRef.current += 1;
            }
        };
    }, [ currentUrl ] );

    return {
        identity,
        previousIdentity,
        lastComparison,
        isLoading,
        error,
    };
}
