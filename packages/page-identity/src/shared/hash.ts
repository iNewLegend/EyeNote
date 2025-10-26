const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const BIT_SIZE = 64;

export function hashToken ( token : string ) : bigint {
    let hash = FNV_OFFSET_BASIS;
    for ( let index = 0; index < token.length; index += 1 ) {
        hash ^= BigInt( token.charCodeAt( index ) );
        hash *= FNV_PRIME;
        hash &= ( 1n << BigInt( BIT_SIZE ) ) - 1n;
    }

    return hash;
}

export function simHash ( tokens : Iterable<string> ) : bigint {
    const vector = new Array<number>( BIT_SIZE ).fill( 0 );

    for ( const token of tokens ) {
        if ( token.length === 0 ) {
            continue;
        }

        const tokenHash = hashToken( token );

        for ( let bit = 0; bit < BIT_SIZE; bit += 1 ) {
            const mask = 1n << BigInt( bit );
            const bitSet = ( tokenHash & mask ) !== 0n;
            vector[ bit ] += bitSet ? 1 : -1;
        }
    }

    let signature = 0n;

    for ( let bit = 0; bit < BIT_SIZE; bit += 1 ) {
        if ( vector[ bit ] >= 0 ) {
            signature |= 1n << BigInt( bit );
        }
    }

    return signature;
}
