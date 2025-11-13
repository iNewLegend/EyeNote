import { toast } from "sonner";

type MessagePayload = {
    type: string;
};

type MessageResult =
    | { success: true }
    | { success: false; error: string };

export function useTabMessaging () {
    const sendMessageToActiveTab = async ( payload: MessagePayload ): Promise<MessageResult> => {
        if ( typeof chrome === "undefined" || !chrome.tabs?.query ) {
            return {
                success: false,
                error: "Cannot reach the active tab from this context.",
            };
        }

        const getActiveTab = () => new Promise<chrome.tabs.Tab | undefined>( ( resolve, reject ) => {
            chrome.tabs.query( { active: true, currentWindow: true }, ( tabs ) => {
                const lastError = chrome.runtime?.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }
                resolve( tabs[ 0 ] );
            } );
        } );

        const sendMessage = ( tabId: number ) => new Promise<boolean>( ( resolve, reject ) => {
            chrome.tabs.sendMessage( tabId, payload, ( response ) => {
                const lastError = chrome.runtime?.lastError;
                if ( lastError ) {
                    reject( new Error( lastError.message ) );
                    return;
                }
                resolve( Boolean( response?.success ) );
            } );
        } );

        try {
            const tab = await getActiveTab();
            if ( !tab?.id ) {
                throw new Error( "No active tab" );
            }
            const wasAccepted = await sendMessage( tab.id );
            if ( !wasAccepted ) {
                return {
                    success: false,
                    error: "Content script rejected the request.",
                };
            }
            return { success: true };
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Unable to reach content script";
            return {
                success: false,
                error: message,
            };
        }
    };

    const buildMessageFailureDescription = ( error?: string ): string => {
        const defaultHint = "Open a regular webpage (not Chrome Web Store or chrome:// pages), ensure EyeNote is enabled, then try again.";
        if ( !error ) {
            return defaultHint;
        }

        const normalized = error.toLowerCase();

        if ( normalized.includes( "no active tab" ) ) {
            return "No active tab detected. Focus a normal browser tab and try again.";
        }

        if ( normalized.includes( "receiving end does not exist" ) || normalized.includes( "could not establish connection" ) ) {
            return "EyeNote isn't injected into this tab yet. Refresh the page or open EyeNote on a supported site, then retry.";
        }

        if ( normalized.includes( "cannot access contents of this page" ) ) {
            return "Chrome blocks extensions on this page. Try again on a standard http/https site.";
        }

        return `${ error }. ${ defaultHint }`;
    };

    const sendMessageWithToast = async ( payload: MessagePayload, errorTitle: string ): Promise<MessageResult> => {
        const result = await sendMessageToActiveTab( payload );
        if ( !result.success ) {
            toast( errorTitle, {
                description: buildMessageFailureDescription( result.error ),
            } );
        }

        return result;
    };

    return {
        sendMessageToActiveTab,
        sendMessageWithToast,
    };
}
