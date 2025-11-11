"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState  } from "react";

import { createPortal } from "react-dom";

import eyeNoteIconImport from "@eye-note/ui/src/assets/icon.svg";

import { cn } from "@eye-note/ui/src/lib/utils";

import type { ReactNode } from "react";

const eyeNoteIconUrl = ( () => {
    if ( typeof chrome !== "undefined" && typeof chrome.runtime?.getURL === "function" ) {
        const normalized = eyeNoteIconImport.startsWith( "/" )
            ? eyeNoteIconImport.slice( 1 )
            : eyeNoteIconImport;
        return chrome.runtime.getURL( normalized );
    }
    return eyeNoteIconImport;
} )();

type ShadowToastTone = "default" | "success" | "danger";

interface ShadowToastOptions {
    id ?: string;
    duration ?: number;
    tone ?: ShadowToastTone;
}

interface ShadowToastContextValue {
    showToast : ( message : string, options ?: ShadowToastOptions ) => string;
    dismissToast : ( id : string ) => void;
}

interface ShadowToastProviderProps {
    children : ReactNode;
    container ?: Element | DocumentFragment | null;
    maxVisible ?: number;
    defaultDuration ?: number;
}

interface InternalShadowToast {
    id : string;
    message : string;
    tone : ShadowToastTone;
}

const ShadowToastContext = createContext<ShadowToastContextValue | null>( null );

const DEFAULT_DURATION = 4000;
const DEFAULT_MAX_VISIBLE = 2;

const toneClassMap : Record<ShadowToastTone, string> = {
    default: "bg-black/80 text-white border-white/20",
    success: "bg-emerald-600 text-white border-emerald-500/30",
    danger: "bg-destructive text-destructive-foreground border-destructive/40",
};

function generateToastId () {
    return Math.random().toString( 36 ).slice( 2, 10 );
}

export function ShadowToastProvider ( {
    children,
    container,
    maxVisible = DEFAULT_MAX_VISIBLE,
    defaultDuration = DEFAULT_DURATION,
} : ShadowToastProviderProps ) {
    const [ toasts, setToasts ] = useState<InternalShadowToast[]>( [] );
    const timeoutsRef = useRef<Map<string, number>>( new Map() );

    const dismissToast = useCallback( ( id : string ) => {
        setToasts( ( prev ) => prev.filter( ( toast ) => toast.id !== id ) );
        const timeoutId = timeoutsRef.current.get( id );
        if ( timeoutId ) {
            clearTimeout( timeoutId );
            timeoutsRef.current.delete( id );
        }
    }, [] );

    const showToast = useCallback( ( message : string, options ?: ShadowToastOptions ) => {
        const id = options?.id ?? generateToastId();
        const tone = options?.tone ?? "default";
        const duration = options?.duration ?? defaultDuration;

        setToasts( ( prev ) => {
            const filtered = prev.filter( ( toast ) => toast.id !== id );
            const next = [ { id, message, tone }, ...filtered ];
            return next.slice( 0, maxVisible );
        } );

        if ( duration > 0 && typeof window !== "undefined" ) {
            const existingTimeout = timeoutsRef.current.get( id );
            if ( existingTimeout ) {
                clearTimeout( existingTimeout );
            }

            const timeoutId = window.setTimeout( () => {
                dismissToast( id );
            }, duration );

            timeoutsRef.current.set( id, timeoutId );
        }

        return id;
    }, [ defaultDuration, dismissToast, maxVisible ] );

    useEffect( () => {
        return () => {
            timeoutsRef.current.forEach( ( timeoutId ) => {
                clearTimeout( timeoutId );
            } );
            timeoutsRef.current.clear();
        };
    }, [] );

    const contextValue = useMemo<ShadowToastContextValue>( () => ( {
        showToast,
        dismissToast,
    } ), [ showToast, dismissToast ] );

    const content = (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col gap-2 p-4">
            { toasts.map( ( toast ) => (
                <div
                    key={ toast.id }
                    className={ cn(
                        "pointer-events-auto w-full rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-6",
                        toneClassMap[ toast.tone ]
                    ) }
                >
                    <div className="flex items-center gap-3">
                        <img
                            src={ eyeNoteIconUrl }
                            alt="EyeNote logo"
                            className="h-8 w-8"
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="flex-1 text-center leading-snug">
                            { toast.message }
                        </div>
                    </div>
                </div>
            ) ) }
        </div>
    );

    const viewport =
        container && typeof document !== "undefined"
            ? createPortal( content, container )
            : content;

    return (
        <ShadowToastContext.Provider value={ contextValue }>
            { children }
            { viewport }
        </ShadowToastContext.Provider>
    );
}

export function useShadowToast () {
    const ctx = useContext( ShadowToastContext );
    if ( ctx === null ) {
        throw new Error( "useShadowToast must be used within a ShadowToastProvider" );
    }

    return ctx;
}
