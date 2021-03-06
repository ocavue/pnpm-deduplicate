import { _require } from "./require";

const lib: typeof import("@pnpm/read-project-manifest") = _require(
  "@pnpm/read-project-manifest"
);

export const { default: readProjectManifest, safeReadProjectManifestOnly } =
  lib;
