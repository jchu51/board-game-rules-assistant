import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const candidatePaths = [join(currentDirectory, "../../openapi.yml")];

const openApiFile = candidatePaths.find((path) => existsSync(path));

if (!openApiFile) {
  throw new Error(
    `openapi.yml not found. Checked: ${candidatePaths.join(", ")}`,
  );
}

export const openApiYaml = readFileSync(openApiFile, "utf8");

export const openApiDocument = YAML.parse(openApiYaml) as Record<
  string,
  unknown
>;
