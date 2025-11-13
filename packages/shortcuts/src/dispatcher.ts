import type {
    ShortcutDefinition,
    ShortcutHandler,
    ShortcutId,
    ShortcutRegistry,
    ShortcutScope,
    ShortcutTriggeredDetail,
} from "./types";
import { isEditableTarget, matchesShortcutCombo, parseShortcutCombo } from "./utils";

interface ShortcutBindingEntry<
    TId extends ShortcutId = ShortcutId,
    TMeta = Record<string, never>
> {
    definition : ShortcutDefinition<TId, TMeta>;
    parsedCombo : ReturnType<typeof parseShortcutCombo>;
}

type ShortcutEventTarget = Window | Document;

export interface BindShortcutOptions<
    TId extends ShortcutId = ShortcutId,
    TMeta = Record<string, never>
> {
    registry : ShortcutRegistry<TId, TMeta>;
    target ?: ShortcutEventTarget;
    scope ?: ShortcutScope | ShortcutScope[];
    ids ?: TId[];
    overrides ?: Partial<Record<TId, ShortcutHandler<TId, TMeta>>>;
    listenerOptions ?: boolean | AddEventListenerOptions;
    respectPrevented ?: boolean;
}

export function bindShortcutDispatcher<
    TId extends ShortcutId = ShortcutId,
    TMeta = Record<string, never>
> (
    options : BindShortcutOptions<TId, TMeta>
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

    const bindings : ShortcutBindingEntry<TId, TMeta>[] = definitions.map( ( definition ) => ( {
        definition,
        parsedCombo: parseShortcutCombo( definition.combo ),
    } ) );

    const handler = ( event : KeyboardEvent ) => {
        for ( const entry of bindings ) {
            const { definition, parsedCombo } = entry;

            if ( shouldSkipEvent( event, definition, options.respectPrevented ?? false ) ) {
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

    const listener : EventListener = ( event ) => {
        handler( event as KeyboardEvent );
    };

    const listenerOptions = options.listenerOptions ?? { capture: true };

    eventTarget.addEventListener( "keydown", listener, listenerOptions );

    return () => {
        eventTarget.removeEventListener( "keydown", listener, listenerOptions );
    };
}

function normalizeScopes ( scope ?: ShortcutScope | ShortcutScope[] ) : ShortcutScope[] | null {
    if ( !scope ) {
        return null;
    }

    return Array.isArray( scope ) ? scope : [ scope ];
}

function selectDefinitions<TId extends ShortcutId, TMeta = Record<string, never>> (
    registry : ShortcutRegistry<TId, TMeta>,
    scopes : ShortcutScope[] | null,
    ids : Set<TId> | null
) : ShortcutDefinition<TId, TMeta>[] {
    let baseList : ShortcutDefinition<TId, TMeta>[];

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

function shouldSkipEvent<TId extends ShortcutId, TMeta = Record<string, never>> (
    event : KeyboardEvent,
    definition : ShortcutDefinition<TId, TMeta>,
    respectPrevented : boolean
) : boolean {
    if ( respectPrevented && event.defaultPrevented ) {
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

function createDefaultHandler<TId extends ShortcutId, TMeta = Record<string, never>> (
    target : ShortcutEventTarget,
    definition : ShortcutDefinition<TId, TMeta>
) : ShortcutHandler<TId, TMeta> | undefined {
    if ( definition.action.type === "event" ) {
        return () => {
            const detail : ShortcutTriggeredDetail<TId> = { shortcutId: definition.id };
            target.dispatchEvent( new CustomEvent( definition.action.eventName, { detail } ) );
        };
    }

    return undefined;
}
