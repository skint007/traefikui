import { describe, it, expect } from "vitest";
import { parseYaml, stringifyYaml } from "../yaml-helpers";

describe("yaml-helpers", () => {
  describe("parseYaml", () => {
    it("should parse valid YAML", () => {
      const yaml = `
http:
  routers:
    my-router:
      rule: "Host(\`example.com\`)"
      service: my-service
`;
      const result = parseYaml(yaml) as Record<string, unknown>;
      expect(result).toBeDefined();
      expect(result.http).toBeDefined();
    });

    it("should return null for empty YAML", () => {
      const result = parseYaml("");
      expect(result).toBeNull();
    });

    it("should handle YAML with arrays", () => {
      const yaml = `
items:
  - one
  - two
  - three
`;
      const result = parseYaml(yaml) as { items: string[] };
      expect(result.items).toEqual(["one", "two", "three"]);
    });
  });

  describe("stringifyYaml", () => {
    it("should convert object to YAML string", () => {
      const data = {
        http: {
          routers: {
            "my-router": {
              rule: 'Host(`example.com`)',
              service: "my-service",
            },
          },
        },
      };
      const result = stringifyYaml(data);
      expect(result).toContain("my-router");
      expect(result).toContain("service: my-service");
    });
  });
});
