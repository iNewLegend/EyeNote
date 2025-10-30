import { useEffect } from "react";

function parseHashParameters () {
    const { hash } = window.location;
    if ( !hash || hash.length <= 1 ) {
        return {} as Record<string, string>;
    }

    const params = new URLSearchParams( hash.slice( 1 ) );
    const result : Record<string, string> = {};
    params.forEach( ( value, key ) => {
        result[ key ] = value;
    } );
    return result;
}

export function AuthCallback () {
    useEffect( () => {
        const params = parseHashParameters();
        const message = {
            type: "EYE_NOTE_OAUTH_REDIRECT",
            payload: {
                accessToken: params.access_token,
                idToken: params.id_token,
                expiresIn: params.expires_in ? Number.parseInt( params.expires_in, 10 ) : undefined,
                state: params.state,
                error: params.error ?? params.error_description,
            },
        };

        if ( window.opener && !window.opener.closed ) {
            window.opener.postMessage( message, window.location.origin );
        }

        const closeTimer = window.setTimeout( () => {
            window.close();
        }, 500 );

        return () => window.clearTimeout( closeTimer );
    }, [] );

    return (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="space-y-2 text-center">
                <h1 className="text-lg font-semibold">Authentication complete</h1>
                <p className="text-sm text-muted-foreground">
                    You can close this window and return to the EyeNote app.
                </p>
            </div>
        </div>
    );
}
