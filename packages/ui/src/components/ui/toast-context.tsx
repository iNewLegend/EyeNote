"use client";

import * as React from "react";

import {
    type ToastActionElement,
    type ToastProps,
} from "./toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
    id: string;
    title ?: React.ReactNode;
    description ?: React.ReactNode;
    action ?: ToastActionElement;
};

type ToastState = {
    toasts: ToasterToast[];
};

type ToastAction =
    | { type: "ADD_TOAST"; toast: ToasterToast }
    | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
    | { type: "DISMISS_TOAST"; toastId ?: string }
    | { type: "REMOVE_TOAST"; toastId ?: string };

type Toast = Omit<ToasterToast, "id"> & { id ?: string };

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function generateToastId() : string {
    return Math.random().toString( 36 ).slice( 2, 10 );
}

function addToRemoveQueue( toastId: string ) {
    if ( toastTimeouts.has( toastId ) ) {
        return;
    }

    const timeout = setTimeout( () => {
        toastTimeouts.delete( toastId );
        dispatch( { type: "REMOVE_TOAST", toastId } );
    }, TOAST_REMOVE_DELAY );

    toastTimeouts.set( toastId, timeout );
}

const listeners = new Set<( state: ToastState ) => void>();

let memoryState : ToastState = { toasts: [] };

function reducer( state: ToastState, action: ToastAction ) : ToastState {
    switch ( action.type ) {
        case "ADD_TOAST": {
            return {
                ...state,
                toasts: [ action.toast, ...state.toasts ].slice( 0, TOAST_LIMIT ),
            };
        }

        case "UPDATE_TOAST": {
            return {
                ...state,
                toasts: state.toasts.map( ( toast ) =>
                    toast.id === action.toast.id ? { ...toast, ...action.toast } : toast
                ),
            };
        }

        case "DISMISS_TOAST": {
            const { toastId } = action;

            if ( toastId ) {
                addToRemoveQueue( toastId );
            } else {
                state.toasts.forEach( ( toast ) => addToRemoveQueue( toast.id ) );
            }

            return {
                ...state,
                toasts: state.toasts.map( ( toast ) =>
                    toast.id === toastId || toastId === undefined
                        ? { ...toast, open: false }
                        : toast
                ),
            };
        }

        case "REMOVE_TOAST": {
            const { toastId } = action;

            if ( toastId === undefined ) {
                return { ...state, toasts: [] };
            }

            return {
                ...state,
                toasts: state.toasts.filter( ( toast ) => toast.id !== toastId ),
            };
        }

        default:
            return state;
    }
}

function dispatch( action: ToastAction ) {
    memoryState = reducer( memoryState, action );
    listeners.forEach( ( listener ) => {
        listener( memoryState );
    } );
}

function toast( { ...props } : Toast ) {
    const id = props.id ?? generateToastId();

    dispatch( {
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: ( open ) => {
                props.onOpenChange?.( open );
                if ( !open ) {
                    dispatch( { type: "DISMISS_TOAST", toastId: id } );
                }
            },
        },
    } );

    return id;
}

function dismiss( toastId ?: string ) {
    dispatch( { type: "DISMISS_TOAST", toastId } );
}

function useToast() {
    const [ state, setState ] = React.useState<ToastState>( memoryState );

    React.useEffect( () => {
        listeners.add( setState );
        return () => {
            listeners.delete( setState );
        };
    }, [] );

    return {
        ...state,
        toast,
        dismiss,
    };
}

export { dismiss, toast, useToast, type ToasterToast };
