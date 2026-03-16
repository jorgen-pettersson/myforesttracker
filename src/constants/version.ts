// Centralized app version, sourced from package.json
// Keeps About UI and any other consumers aligned with package metadata.
// Use require to avoid import-assert syntax issues in Metro.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json");

export const appVersion: string = pkg.version as string;
