import { _require } from "./require";

const lib: typeof import("@pnpm/lockfile-file") = _require(
  "@pnpm/lockfile-file"
);

export const { readWantedLockfile } = lib;

export type { Dependencies } from "@pnpm/lockfile-file";
