import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { URL } from "node:url";
import type { NotificationRecord } from "@eye-note/definitions";
import { appConfig } from "../config";

const INTERNAL_PATH = "/internal/notifications/broadcast";

interface BroadcastPayload {
    notifications : NotificationRecord[];
}

export async function broadcastNotifications ( notifications : NotificationRecord[] ) : Promise<void> {
    if ( notifications.length === 0 ) {
        return;
    }

    const baseUrl = appConfig.realtime.baseUrl;
    if ( !baseUrl ) {
        return;
    }

    const target = new URL( INTERNAL_PATH, baseUrl );
    const body : BroadcastPayload = { notifications };
    const serialized = JSON.stringify( body );

    await new Promise<void>( ( resolve, reject ) => {
        const isHttps = target.protocol === "https:";
        const requestFn = isHttps ? httpsRequest : httpRequest;
        const req = requestFn( {
            method: "POST",
            hostname: target.hostname,
            port: target.port || ( isHttps ? 443 : 80 ),
            path: `${ target.pathname }${ target.search }`,
            headers: {
                "content-type": "application/json",
                "content-length": Buffer.byteLength( serialized ).toString(),
                "x-realtime-secret": appConfig.realtime.jwtSecret,
            },
        }, ( res ) => {
            const chunks : Buffer[] = [];
            res.on( "data", ( chunk ) => chunks.push( chunk as Buffer ) );
            res.on( "end", () => {
                if ( res.statusCode && res.statusCode >= 400 ) {
                    const message = Buffer.concat( chunks ).toString() || `status ${ res.statusCode }`;
                    reject( new Error( `Realtime broadcast failed: ${ message }` ) );
                    return;
                }
                resolve();
            } );
        } );

        req.on( "error", ( error ) => {
            reject( error );
        } );

        req.write( serialized );
        req.end();
    } ).catch( ( error ) => {
        // Swallow broadcast failures so they don't block main request.
        console.warn( "[EyeNote] Failed to broadcast notifications", error );
    } );
}
