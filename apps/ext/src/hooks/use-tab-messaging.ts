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

    const buildMessageFailureDescription = ( error?: string ): string =>
        error ? `${ error } Make sure EyeNote is active on this tab.` : "Make sure EyeNote is active on this tab.";

    const sendMessageWithToast = async ( payload: MessagePayload, errorTitle: string ) => {
        const result = await sendMessageToActiveTab( payload );
        if ( !result.success ) {
            toast( errorTitle, {
                description: buildMessageFailureDescription( result.error ),
            } );
        }
    };

    return {
        sendMessageToActiveTab,
        sendMessageWithToast,
    };
}

