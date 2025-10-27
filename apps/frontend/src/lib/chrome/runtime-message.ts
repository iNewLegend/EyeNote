export interface RuntimeMessageOptions {
    timeoutMs ?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export async function sendRuntimeMessage<TResponse>(
    message : unknown,
    options : RuntimeMessageOptions = {}
) : Promise<TResponse> {
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    if ( typeof chrome === "undefined" || !chrome.runtime?.sendMessage ) {
        throw new Error( "Chrome runtime messaging is unavailable in this context." );
    }

    return new Promise<TResponse>( ( resolve, reject ) => {
        const timer = globalThis.setTimeout( () => {
            reject( new Error( "Timed out waiting for background response." ) );
        }, timeout );

        try {
            chrome.runtime.sendMessage( message, ( response ) => {
                globalThis.clearTimeout( timer );

                const lastError = chrome.runtime.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }

                resolve( response as TResponse );
            } );
        } catch ( error ) {
            globalThis.clearTimeout( timer );
            reject( error instanceof Error ? error : new Error( String( error ) ) );
        }
    } );
}
