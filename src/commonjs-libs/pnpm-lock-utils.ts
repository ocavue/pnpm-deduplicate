import { _require } from "./require";

const lib: typeof import("@pnpm/lockfile-utils") = _require(
  "@pnpm/lockfile-utils"
);

export const nameVerFromPkgSnapshot = lib.nameVerFromPkgSnapshot;
