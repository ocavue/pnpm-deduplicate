import { program } from "commander";
import { fixDuplicates, listDuplicates } from "./index.js";

const version = require("../package.json").version;

export async function runCli() {
  program
    .version(version)
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
