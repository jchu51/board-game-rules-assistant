import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

const openApiFile = join(process.cwd(), "openapi.yml");

export const openApiYaml = readFileSync(openApiFile, "utf8");

export const openApiDocument = YAML.parse(openApiYaml) as Record<
  string,
  unknown
>;
