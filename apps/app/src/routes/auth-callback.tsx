import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@eye-note/ui";

function parseHashFragment () {
    const hash = window.location.hash.startsWith( "#" )
        ? window.location.hash.slice( 1 )
        : window.location.hash;
    const params = new URLSearchParams( hash );
    const payload : Record<string, string> = {};
    params.forEach( ( value, key ) => {
        payload[ key ] = value;
    } );
    return payload;
}

export function AuthCallbackPage () {
    const [ status, setStatus ] = useState<"pending" | "success" | "error">( "pending" );
    const [ message, setMessage ] = useState<string>( "Completing sign-in…" );

    const payload = useMemo( () => parseHashFragment(), [] );

    useEffect( () => {
        const accessor = () => {
            if ( payload.error ) {
                setStatus( "error" );
                setMessage( payload.error_description ?? payload.error ?? "Authentication failed" );
            } else if ( payload.id_token && payload.access_token ) {
                setStatus( "success" );
                setMessage( "You may close this window." );
            } else {
                setStatus( "error" );
                setMessage( "Missing tokens in authentication response." );
            }

            if ( window.opener && !window.opener.closed ) {
                window.opener.postMessage( {
                    type: "EYE_NOTE_OAUTH_REDIRECT",
                    payload: {
                        idToken: payload.id_token,
                        accessToken: payload.access_token,
                        expiresIn: payload.expires_in ? Number( payload.expires_in ) : undefined,
                        state: payload.state,
                        error: payload.error,
                    },
                }, window.location.origin );
                window.close();
            }
        };

        accessor();
    }, [ payload ] );

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
            <Card className="w-full max-w-md border border-border/60 bg-card/80 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-center text-lg font-semibold">
                        Finish Signing In
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
                    {status === "success" ? (
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                    ) : status === "error" ? (
                        <TriangleAlert className="h-10 w-10 text-destructive" />
                    ) : null}
                    <p>{message}</p>
                    {status === "error" ? (
                        <p className="text-xs text-muted-foreground/80">
                            You can close this tab and try signing in again.
                        </p>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
