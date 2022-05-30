// @ts-check

import { build } from "esbuild";
import path from "node:path";
import { nodeExternalsPlugin } from "esbuild-node-externals";

async function main() {
  await build({
    entryPoints: ["./src/cli.ts", "./src/index.ts"],
    outExtension: { ".js": ".cjs" },
    outdir: path.join("./dist"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node14",
    sourcemap: false,
    minify: false,
    plugins: [nodeExternalsPlugin()],
  });
}

main();
