import type {
    ShortcutDefinition,
    ShortcutHandler,
    ShortcutId,
    ShortcutRegistry,
    ShortcutScope,
    ShortcutTriggeredDetail,
} from "./types";
import { isEditableTarget, matchesShortcutCombo, parseShortcutCombo } from "./utils";

interface ShortcutBindingEntry<TId extends ShortcutId = ShortcutId> {
    definition : ShortcutDefinition<TId>;
    parsedCombo : ReturnType<typeof parseShortcutCombo>;
}

type ShortcutEventTarget = Window | Document;

export interface BindShortcutOptions<TId extends ShortcutId = ShortcutId> {
    registry : ShortcutRegistry<TId>;
    target ?: ShortcutEventTarget;
    scope ?: ShortcutScope | ShortcutScope[];
    ids ?: TId[];
    overrides ?: Partial<Record<TId, ShortcutHandler<TId>>>;
}

export function bindShortcutDispatcher<TId extends ShortcutId = ShortcutId> (
    options : BindShortcutOptions<TId>
) : () => void {
    if ( typeof window === "undefined" ) {
        return () => {};
    }

    const eventTarget : ShortcutEventTarget = options.target ?? window;
    const scopes = normalizeScopes( options.scope );
    const ids = options.ids ? new Set( options.ids ) : null;

    const definitions = selectDefinitions( options.registry, scopes, ids );

    if ( definitions.length === 0 ) {
        return () => {};
    }

    const bindings : ShortcutBindingEntry<TId>[] = definitions.map( ( definition ) => ( {
        definition,
        parsedCombo: parseShortcutCombo( definition.combo ),
    } ) );

    const handler = ( event : KeyboardEvent ) => {
        for ( const entry of bindings ) {
            const { definition, parsedCombo } = entry;

            if ( shouldSkipEvent( event, definition ) ) {
                continue;
            }

            if ( !matchesShortcutCombo( event, parsedCombo ) ) {
                continue;
            }

            if ( definition.preventDefault !== false ) {
                event.preventDefault();
            }

            const override = options.overrides?.[ definition.id ];
            const fallback = createDefaultHandler( eventTarget, definition );
            const finalHandler = override ?? fallback;

            finalHandler?.( event, definition );
            break;
        }
    };

    eventTarget.addEventListener( "keydown", handler as EventListener );

    return () => {
        eventTarget.removeEventListener( "keydown", handler as EventListener );
    };
}

function normalizeScopes ( scope ?: ShortcutScope | ShortcutScope[] ) : ShortcutScope[] | null {
    if ( !scope ) {
        return null;
    }

    return Array.isArray( scope ) ? scope : [ scope ];
}

function selectDefinitions<TId extends ShortcutId> (
    registry : ShortcutRegistry<TId>,
    scopes : ShortcutScope[] | null,
    ids : Set<TId> | null
) : ShortcutDefinition<TId>[] {
    let baseList : ShortcutDefinition<TId>[];

    if ( scopes && scopes.length > 0 ) {
        baseList = scopes.flatMap( ( scope ) => registry.listByScope( scope ) );
    } else {
        baseList = registry.list();
    }

    if ( !ids ) {
        return baseList;
    }

    return baseList.filter( ( definition ) => ids.has( definition.id ) );
}

function shouldSkipEvent<TId extends ShortcutId> (
    event : KeyboardEvent,
    definition : ShortcutDefinition<TId>
) : boolean {
    if ( event.defaultPrevented ) {
        return true;
    }

    if ( event.repeat && !definition.allowRepeat ) {
        return true;
    }

    if ( !definition.allowWhileTyping && isEditableTarget( event.target ) ) {
        return true;
    }

    return false;
}

function createDefaultHandler<TId extends ShortcutId> (
    target : ShortcutEventTarget,
    definition : ShortcutDefinition<TId>
) : ShortcutHandler<TId> | undefined {
    if ( definition.action.type === "event" ) {
        return () => {
            const detail : ShortcutTriggeredDetail<TId> = { shortcutId: definition.id };
            target.dispatchEvent( new CustomEvent( definition.action.eventName, { detail } ) );
        };
    }

    return undefined;
}
