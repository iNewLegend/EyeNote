import rawTokens from "./z-index-tokens.json";

type ZIndexTokenMap = typeof rawTokens;
export type ZIndexToken = keyof ZIndexTokenMap;

/**
 * Numeric z-index tokens keyed by their semantic meaning.
 * These values are sourced from `z-index-tokens.json` so we have a single
 * place to reason about stacking contexts across the extension, dashboard,
 * and shared UI package.
 */
export const Z_INDEX: Record<ZIndexToken, number> = Object.freeze(
    ( Object.entries( rawTokens ) as [ ZIndexToken, ZIndexTokenMap[ZIndexToken] ][] ).reduce(
        ( acc, [ key, meta ] ) => {
            acc[ key ] = meta.value;
            return acc;
        },
        {} as Record<ZIndexToken, number>
    )
);

/**
 * Rich metadata for each z-index token, including a short description that
 * explains why the layer exists. Prefer referencing this map in docs and
 * debugging output instead of repeating descriptions inline.
 */
export const Z_INDEX_META: Readonly<ZIndexTokenMap> = Object.freeze( rawTokens );
