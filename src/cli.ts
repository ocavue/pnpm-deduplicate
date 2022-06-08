import { program } from "commander";
import { fixDuplicates, listDuplicates } from "./index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

function readVersion() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const pkgPath = join(__dirname, "../package.json");
  return JSON.parse(readFileSync(pkgPath, "utf8")).version;
}

export async function runCli() {
  program
    .version(readVersion())
    .usage("[options]")
    .option(
      "-l, --list",
      "do not change pnpm-lock.yaml, just output the diagnosis"
    );

  program.parse(process.argv);

  const { list } = program.opts();

  const root = process.cwd();

  if (list) {
    await listDuplicates(root);
  } else {
    await fixDuplicates(root);
  }
}
