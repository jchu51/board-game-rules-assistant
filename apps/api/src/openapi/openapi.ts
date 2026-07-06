import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const openApiFile = join(currentDirectory, "../../openapi.yml");

export const openApiYaml = readFileSync(openApiFile, "utf8");

export const openApiDocument = YAML.parse(openApiYaml) as Record<
  string,
  unknown
>;
