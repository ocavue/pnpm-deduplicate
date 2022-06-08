// @ts-check

import { build } from "esbuild";
import path from "node:path";
import { nodeExternalsPlugin } from "esbuild-node-externals";

async function main() {
  await build({
    entryPoints: ["./src/cli.ts", "./src/index.ts"],
    outExtension: { ".js": ".mjs" },
    outdir: path.join("./dist"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node14",
    sourcemap: false,
    minify: false,
    plugins: [nodeExternalsPlugin()],
  });
}

main();
