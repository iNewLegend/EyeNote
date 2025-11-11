import { zLintDefaultConfig } from "@zenflux/eslint";

const config = zLintDefaultConfig( [ "**/*.{ts,tsx}" ], [ "." ] );

export default config;