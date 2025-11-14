import type { ListNotificationsResponse, NotificationRecord } from "@eye-note/definitions";
import { apiRequest } from "../../lib/api-client";

export async function fetchNotifications ( cursor ?: string ) : Promise<ListNotificationsResponse> {
    return apiRequest<ListNotificationsResponse>( "/api/notifications", {
        searchParams: cursor ? { cursor } : undefined,
    } );
}

export async function markNotificationRead ( notificationId : string ) : Promise<NotificationRecord> {
    return apiRequest<NotificationRecord>( `/api/notifications/${ notificationId }/read`, {
        method: "POST",
    } );
}

export async function markAllNotificationsRead () : Promise<{ updated : number }> {
    return apiRequest<{ updated : number }>( "/api/notifications/read-all", {
        method: "POST",
    } );
}
