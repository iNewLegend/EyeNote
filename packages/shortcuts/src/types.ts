export type ShortcutScope = "global" | "overlay" | "popup";

export type ShortcutId = string;

export interface ShortcutActionEvent {
    type : "event";
    eventName : string;
}

export type ShortcutAction = ShortcutActionEvent;

export interface ShortcutDefinition<TId extends ShortcutId = ShortcutId> {
    id : TId;
    label : string;
    description ?: string;
    combo : string;
    scope : ShortcutScope;
    allowWhileTyping ?: boolean;
    allowRepeat ?: boolean;
    preventDefault ?: boolean;
    action : ShortcutAction;
}

export interface ShortcutTriggeredDetail<TId extends ShortcutId = ShortcutId> {
    shortcutId : TId;
}

export type ShortcutHandler<TId extends ShortcutId = ShortcutId> = (
    event : KeyboardEvent,
    definition : ShortcutDefinition<TId>
) => void;

export interface ShortcutRegistry<TId extends ShortcutId = ShortcutId> {
    register : ( definition : ShortcutDefinition<TId> ) => void;
    registerMany : ( definitions : ShortcutDefinition<TId>[] ) => void;
    unregister : ( id : TId ) => void;
    get : ( id : TId ) => ShortcutDefinition<TId> | undefined;
    require : ( id : TId ) => ShortcutDefinition<TId>;
    list : () => ShortcutDefinition<TId>[];
    listByScope : ( scope : ShortcutScope ) => ShortcutDefinition<TId>[];
    getDisplayText : ( id : TId ) => string;
}
