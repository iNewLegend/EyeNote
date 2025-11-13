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
    debugLabel ?: string;
}

export function bindShortcutDispatcher<
    TId extends ShortcutId = ShortcutId,
    TMeta = Record<string, never>
> (
    options : BindShortcutOptions<TId, TMeta>
) : () => void {
    if ( typeof window === "undefined" && typeof document === "undefined" ) {
        return () => {};
    }

    const defaultTarget : ShortcutEventTarget | null = options.target
        ?? ( typeof document !== "undefined" ? document : null )
        ?? ( typeof window !== "undefined" ? window : null );

    if ( !defaultTarget ) {
        return () => {};
    }

    const eventTarget : ShortcutEventTarget = defaultTarget;
    const debugLabel = options.debugLabel ?? "shortcuts";
    const debugLog = ( message : string, payload ?: Record<string, unknown> ) => {
        console.info( "[EyeNote][Shortcut]", debugLabel, message, payload ?? {} );
    };
    const scopes = normalizeScopes( options.scope );
    const ids = options.ids ? new Set( options.ids ) : null;

    const definitions = selectDefinitions( options.registry, scopes, ids );

    if ( definitions.length === 0 ) {
        debugLog( "no definitions registered", {
            scopes,
            ids: ids ? Array.from( ids ) : null,
        } );
        return () => {};
    }

    const bindings : ShortcutBindingEntry<TId, TMeta>[] = definitions.map( ( definition ) => ( {
        definition,
        parsedCombo: parseShortcutCombo( definition.combo ),
    } ) );

    const handler = ( event : KeyboardEvent ) => {
        debugLog( "keydown", {
            key: event.key,
            shift: event.shiftKey,
            alt: event.altKey,
            ctrl: event.ctrlKey,
            meta: event.metaKey,
            repeat: event.repeat,
            targetTag: ( event.target as HTMLElement | null )?.tagName ?? null,
            timestamp: Date.now(),
        } );
        for ( const entry of bindings ) {
            const { definition, parsedCombo } = entry;

            const skipReason = determineSkipReason( event, definition, options.respectPrevented ?? false );
            if ( skipReason ) {
                debugLog( "skipping shortcut", {
                    shortcutId: definition.id,
                    reason: skipReason,
                    combo: definition.combo,
                } );
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
            debugLog( "shortcut matched", {
                shortcutId: definition.id,
                combo: definition.combo,
                scope: definition.scope,
                timestamp: Date.now(),
            } );
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

function determineSkipReason<TId extends ShortcutId, TMeta = Record<string, never>> (
    event : KeyboardEvent,
    definition : ShortcutDefinition<TId, TMeta>,
    respectPrevented : boolean
) : string | null {
    if ( respectPrevented && event.defaultPrevented ) {
        return "event already prevented";
    }

    if ( event.repeat && !definition.allowRepeat ) {
        return "repeat disallowed";
    }

    if ( !definition.allowWhileTyping && isEditableTarget( event.target ) ) {
        return "typing focus disallowed";
    }

    return null;
}

function createDefaultHandler<TId extends ShortcutId, TMeta = Record<string, never>> (
    target : ShortcutEventTarget,
    definition : ShortcutDefinition<TId, TMeta>
) : ShortcutHandler<TId, TMeta> | undefined {
    if ( definition.action.type === "event" ) {
        return () => {
            const detail : ShortcutTriggeredDetail<TId> = { shortcutId: definition.id };
            const dispatcher = typeof window !== "undefined" ? window : target;
            dispatcher.dispatchEvent( new CustomEvent( definition.action.eventName, {
                detail,
                bubbles: true,
            } ) );
        };
    }

    return undefined;
}
