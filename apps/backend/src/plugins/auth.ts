import { createFastifyAuthPlugin } from "@eye-note/auth/backend";

import { appConfig } from "@eye-note/backend/src/config";

export const authPlugin = createFastifyAuthPlugin( {
    googleClientId: appConfig.auth.googleClientId,
    disabled: appConfig.auth.disabled,
} );
