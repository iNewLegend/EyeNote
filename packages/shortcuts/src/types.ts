export type ShortcutScope = "global" | "overlay" | "popup";

export type ShortcutId = string;

export interface ShortcutActionEvent {
    type : "event";
    eventName : string;
}

export type ShortcutAction = ShortcutActionEvent;

export interface ShortcutDefinition<TId extends ShortcutId = ShortcutId, TMeta = Record<string, never>> {
    id : TId;
    label : string;
    description ?: string;
    combo : string;
    scope : ShortcutScope;
    allowWhileTyping ?: boolean;
    allowRepeat ?: boolean;
    preventDefault ?: boolean;
    action : ShortcutAction;
    meta ?: TMeta;
}

export interface ShortcutTriggeredDetail<TId extends ShortcutId = ShortcutId> {
    shortcutId : TId;
}

export type ShortcutHandler<TId extends ShortcutId = ShortcutId, TMeta = Record<string, never>> = (
    event : KeyboardEvent,
    definition : ShortcutDefinition<TId, TMeta>
) => void;

export interface ShortcutRegistry<TId extends ShortcutId = ShortcutId, TMeta = Record<string, never>> {
    register : ( definition : ShortcutDefinition<TId, TMeta> ) => void;
    registerMany : ( definitions : ShortcutDefinition<TId, TMeta>[] ) => void;
    unregister : ( id : TId ) => void;
    get : ( id : TId ) => ShortcutDefinition<TId, TMeta> | undefined;
    require : ( id : TId ) => ShortcutDefinition<TId, TMeta>;
    list : () => ShortcutDefinition<TId, TMeta>[];
    listByScope : ( scope : ShortcutScope ) => ShortcutDefinition<TId, TMeta>[];
    getDisplayText : ( id : TId ) => string;
}
