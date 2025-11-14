interface ParsedShortcutCombo {
    key : string;
    shift : boolean;
    alt : boolean;
    meta : boolean;
    ctrl : boolean;
    mod : boolean;
}

const MAC_PLATFORM = typeof navigator !== "undefined"
    ? /Mac|iPhone|iPad|iPod/.test( navigator.platform )
    : false;

export function parseShortcutCombo ( combo : string ) : ParsedShortcutCombo {
    if ( combo.trim().length === 0 ) {
        throw new Error( "Shortcut combo cannot be empty" );
    }

    const segments = combo.split( "+" ).map( ( part ) => part.trim() ).filter( Boolean );
    if ( segments.length === 0 ) {
        throw new Error( `Invalid shortcut combo: ${ combo }` );
    }

    const keySegment = segments.pop() ?? "";
    const parsed : ParsedShortcutCombo = {
        key: normalizeKey( keySegment ),
        shift: false,
        alt: false,
        meta: false,
        ctrl: false,
        mod: false,
    };

    for ( const modifierRaw of segments ) {
        const modifier = modifierRaw.toLowerCase();
        switch ( modifier ) {
            case "shift":
                parsed.shift = true;
                break;
            case "alt":
            case "option":
                parsed.alt = true;
                break;
            case "meta":
            case "cmd":
            case "command":
            case "super":
                parsed.meta = true;
                break;
            case "control":
            case "ctrl":
                parsed.ctrl = true;
                break;
            case "mod":
                parsed.mod = true;
                break;
            default:
                throw new Error( `Unsupported modifier "${ modifierRaw }" in combo ${ combo }` );
        }
    }

    return parsed;
}

export function matchesShortcutCombo ( event : KeyboardEvent, combo : ParsedShortcutCombo ) : boolean {
    if ( combo.shift !== event.shiftKey ) {
        return false;
    }
    if ( combo.alt !== event.altKey ) {
        return false;
    }

    const metaActive = event.metaKey;
    const ctrlActive = event.ctrlKey;

    if ( combo.mod ) {
        if ( MAC_PLATFORM ) {
            if ( !metaActive || ctrlActive ) {
                return false;
            }
        } else {
            if ( !ctrlActive || metaActive ) {
                return false;
            }
        }
    } else {
        if ( combo.meta !== metaActive ) {
            return false;
        }
        if ( combo.ctrl !== ctrlActive ) {
            return false;
        }
    }

    return normalizeKey( event.key ) === combo.key;
}

export function formatShortcutDisplay ( combo : string ) : string {
    return combo
        .split( "+" )
        .map( ( part ) => part.trim() )
        .filter( Boolean )
        .map( ( part, index, array ) => {
            if ( index === array.length - 1 && part.length === 1 ) {
                return part.toUpperCase();
            }
            return capitalize( part );
        } )
        .join( " + " );
}

export function isEditableTarget ( target : EventTarget | null ) : boolean {
    if ( !( target instanceof HTMLElement ) ) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    if ( target.isContentEditable ) {
        return true;
    }

    return [ "input", "textarea", "select" ].includes( tagName );
}

function normalizeKey ( value : string ) : string {
    const normalized = value.trim();
    if ( normalized.length === 0 ) {
        return "";
    }

    if ( normalized.length === 1 ) {
        return normalized.toLowerCase();
    }

    switch ( normalized.toLowerCase() ) {
        case "esc":
            return "escape";
        default:
            return normalized.toLowerCase();
    }
}

function capitalize ( value : string ) : string {
    if ( value.length === 0 ) {
        return value;
    }

    return value[ 0 ].toUpperCase() + value.slice( 1 ).toLowerCase();
}

export type { ParsedShortcutCombo };
