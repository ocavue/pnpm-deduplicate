import { _require } from "./require";

const lib: typeof import("@pnpm/lockfile-walker") = _require(
  "@pnpm/lockfile-walker"
);

export const { default: lockfileWalker } = lib;
export type { LockfileWalkerStep } from "@pnpm/lockfile-walker";
