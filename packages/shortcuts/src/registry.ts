import type {
    ShortcutDefinition,
    ShortcutId,
    ShortcutRegistry,
    ShortcutScope,
} from "./types";
import { formatShortcutDisplay } from "./utils";

export function createShortcutRegistry<
    TId extends ShortcutId = ShortcutId,
    TMeta = Record<string, never>
> (
    initialDefinitions : ShortcutDefinition<TId, TMeta>[] = []
) : ShortcutRegistry<TId, TMeta> {
    const byId = new Map<TId, ShortcutDefinition<TId, TMeta>>();
    const scopeIndex = new Map<ShortcutScope, Set<TId>>();

    const register = ( definition : ShortcutDefinition<TId, TMeta> ) => {
        const existing = byId.get( definition.id );
        if ( existing ) {
            removeFromScope( existing );
        }

        byId.set( definition.id, definition );
        addToScope( definition );
    };

    const registerMany = ( definitions : ShortcutDefinition<TId, TMeta>[] ) => {
        definitions.forEach( register );
    };

    const unregister = ( id : TId ) => {
        const existing = byId.get( id );
        if ( !existing ) {
            return;
        }
        byId.delete( id );
        removeFromScope( existing );
    };

    const get = ( id : TId ) => byId.get( id );

    const require = ( id : TId ) => {
        const definition = get( id );
        if ( !definition ) {
            throw new Error( `Shortcut definition not found for id: ${ String( id ) }` );
        }
        return definition;
    };

    const list = () => Array.from( byId.values() );

    const listByScope = ( scope : ShortcutScope ) => {
        const ids = scopeIndex.get( scope );
        if ( !ids ) {
            return [];
        }
        return Array.from( ids ).map( ( id ) => require( id ) );
    };

    const getDisplayText = ( id : TId ) => formatShortcutDisplay( require( id ).combo );

    const addToScope = ( definition : ShortcutDefinition<TId, TMeta> ) => {
        const scoped = scopeIndex.get( definition.scope ) ?? new Set<TId>();
        scoped.add( definition.id );
        scopeIndex.set( definition.scope, scoped );
    };

    const removeFromScope = ( definition : ShortcutDefinition<TId, TMeta> ) => {
        const scoped = scopeIndex.get( definition.scope );
        if ( !scoped ) {
            return;
        }
        scoped.delete( definition.id );
        if ( scoped.size === 0 ) {
            scopeIndex.delete( definition.scope );
        }
    };

    registerMany( initialDefinitions );

    return {
        register,
        registerMany,
        unregister,
        get,
        require,
        list,
        listByScope,
        getDisplayText,
    };
}
