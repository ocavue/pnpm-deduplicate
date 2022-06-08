import { _require } from "./require";

const lib: typeof import("@pnpm/lockfile-walker") = _require(
  "@pnpm/lockfile-walker"
);

export const lockfileWalker = lib.default;
export type { LockfileWalkerStep } from "@pnpm/lockfile-walker";
