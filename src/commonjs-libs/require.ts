import { createRequire } from "node:module";

export const _require = createRequire(import.meta.url);
