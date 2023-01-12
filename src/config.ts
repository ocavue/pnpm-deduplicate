import fs from "node:fs";
import path from "node:path";
import json5 from "json5";

export interface Config {
  readonly ignored?: readonly string[];
}

const CONFIG_FILENAME = "pnpm-deduplicate.json";

export async function readConfig(dir: string): Promise<Config | null> {
  const configPath = path.join(dir, CONFIG_FILENAME);

  let buf: Buffer;
  try {
    buf = await fs.promises.readFile(configPath);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed = json5.parse(buf.toString());
  assertValidConfig(parsed);

  return parsed;
}

// This function manually validates the config currently since it's small. If
// the config ever grows in size, consider using a runtime validation library
// such as runtypes, ajv, etc.
export function assertValidConfig(obj: unknown): asserts obj is Config {
  if (obj == null) {
    throw new Error("The config object to validate was null or undefined.");
  }

  const ignored = (obj as Partial<Config>).ignored;

  if (ignored != null && !isArrayOfString(ignored)) {
    throw new Error(
      `Expected the ${CONFIG_FILENAME} config "ignored" field to be an array of strings.`
    );
  }
}

function isArrayOfString(obj: unknown): obj is string[] {
  return (
    obj != null && Array.isArray(obj) && obj.every((x) => typeof x === "string")
  );
}
