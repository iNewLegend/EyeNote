import { getBaseConfig } from "@eye-note/workspace/vite/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig( () => {
    return {
        ... getBaseConfig( {
            hostEnvPrefix: 'APP'
        } ),
        plugins: [ react() ],
    };
} );
