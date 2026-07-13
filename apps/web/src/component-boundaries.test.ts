import { describe, expect, it } from "vitest";

const sourceFiles = import.meta.glob("./**/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("React component boundaries", () => {
  it("keeps no more than one named component in each TSX file", () => {
    const violations = Object.entries(sourceFiles).flatMap(([path, source]) => {
      if (path.endsWith(".test.tsx")) return [];
      const components = [
        ...source.matchAll(/^(?:export\s+)?function\s+([A-Z]\w*)\s*\(/gm),
      ].map((match) => match[1]);

      return components.length > 1 ? [`${path}: ${components.join(", ")}`] : [];
    });

    expect(violations).toEqual([]);
  });
});
