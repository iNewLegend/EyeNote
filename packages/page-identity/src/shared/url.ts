import { DEFAULT_QUERY_PARAM_IGNORES } from "./constants";

export type NormalizeUrlOptions = {
    ignoreQueryParams?: string[];
    stripHash?: boolean;
    baseUrl?: string;
};

export function normalizeUrl ( rawUrl : string, options : NormalizeUrlOptions = {} ) : string {
    const {
        ignoreQueryParams = DEFAULT_QUERY_PARAM_IGNORES,
        stripHash = true,
        baseUrl,
    } = options;

    let url: URL;

    try {
        url = new URL( rawUrl, baseUrl );
    } catch ( error ) {
        return rawUrl;
    }

    const ignoreSet = new Set(
        ignoreQueryParams.map( ( param ) => param.toLowerCase() )
    );

    const retainedParams : [ string, string ][] = [];

    url.searchParams.forEach( ( value, key ) => {
        if ( ! ignoreSet.has( key.toLowerCase() ) && value !== "" ) {
            retainedParams.push( [ key, value ] );
        }
    } );

    retainedParams.sort( ( left, right ) => {
        if ( left[ 0 ] === right[ 0 ] ) {
            return left[ 1 ].localeCompare( right[ 1 ] );
        }

        return left[ 0 ].localeCompare( right[ 0 ] );
    } );

    url.search = retainedParams
        .map(
            ( [ key, value ] ) =>
                `${ encodeURIComponent( key ) }=${ encodeURIComponent( value ) }`
        )
        .join( "&" );

    if ( url.search.length > 0 ) {
        url.search = `?${ url.search }`;
    }

    if ( stripHash ) {
        url.hash = "";
    }

    url.hash = url.hash.replace( /^#/, "" );

    return `${ url.origin }${ url.pathname }${ url.search }${ url.hash ? `#${ url.hash }` : "" }`;
}
