export type StoredAuth = {
    authToken ?: string;
    userId ?: string;
    userEmail ?: string;
};

export async function getStoredAuth () : Promise<StoredAuth> {
    if ( typeof chrome === "undefined" || !chrome.storage?.local ) {
        return {};
    }

    return new Promise<StoredAuth>( ( resolve ) => {
        chrome.storage.local.get(
            [ "authToken", "authTokenExpiresAt", "user" ],
            ( result ) => {
                const token = result.authToken as string | undefined;
                const expiresAt = result.authTokenExpiresAt as number | undefined;
                const user = result.user as { id ?: string; email ?: string } | undefined;

                const isExpired =
                    typeof expiresAt === "number" &&
                    Number.isFinite( expiresAt ) &&
                    expiresAt < Date.now();

                resolve( {
                    authToken: isExpired ? undefined : token,
                    userId: user?.id,
                    userEmail: user?.email,
                } );
            }
        );
    } );
}
