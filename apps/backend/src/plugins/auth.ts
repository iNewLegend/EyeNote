import { createFastifyAuthPlugin } from "@eye-note/auth/backend";

import { appConfig } from "../config";

export const authPlugin = createFastifyAuthPlugin( {
    googleClientId: appConfig.auth.googleClientId,
    disabled: appConfig.auth.disabled,
} );
