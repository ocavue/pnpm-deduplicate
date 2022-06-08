import { _require } from "./require";

const lib: typeof import("@pnpm/manifest-utils") = _require(
  "@pnpm/manifest-utils"
);

export const { getAllDependenciesFromManifest } = lib;
