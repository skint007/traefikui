import { describe, it, expect } from "vitest";
import { routerToYaml, serviceToYaml, middlewareToYaml } from "../form-to-yaml";

describe("form-to-yaml", () => {
  describe("routerToYaml", () => {
    it("should generate valid router YAML", () => {
      const result = routerToYaml({
        name: "my-router",
        rule: "Host(`example.com`)",
        entryPoints: ["websecure"],
        service: "my-service",
        middlewares: ["auth"],
      });

      expect(result).toContain("my-router");
      expect(result).toContain("Host(`example.com`)");
      expect(result).toContain("websecure");
      expect(result).toContain("my-service");
      expect(result).toContain("auth");
    });

    it("should handle TLS configuration", () => {
      const result = routerToYaml({
        name: "secure-router",
        rule: "Host(`secure.com`)",
        entryPoints: ["websecure"],
        service: "my-service",
        tls: { certResolver: "letsencrypt" },
      });

      expect(result).toContain("tls");
      expect(result).toContain("letsencrypt");
    });
  });

  describe("serviceToYaml", () => {
    it("should generate valid service YAML", () => {
      const result = serviceToYaml({
        name: "my-service",
        servers: [{ url: "http://backend:8080" }],
        passHostHeader: true,
      });

      expect(result).toContain("my-service");
      expect(result).toContain("http://backend:8080");
      expect(result).toContain("passHostHeader");
    });
  });

  describe("middlewareToYaml", () => {
    it("should generate valid headers middleware YAML", () => {
      const result = middlewareToYaml({
        name: "sec-headers",
        type: "headers",
        headers: {
          frameDeny: true,
          contentTypeNosniff: true,
        },
      });

      expect(result).toContain("sec-headers");
      expect(result).toContain("frameDeny");
      expect(result).toContain("contentTypeNosniff");
    });

    it("should generate valid rate limit middleware YAML", () => {
      const result = middlewareToYaml({
        name: "rate-limit",
        type: "rateLimit",
        rateLimit: {
          average: 100,
          burst: 50,
        },
      });

      expect(result).toContain("rate-limit");
      expect(result).toContain("average: 100");
      expect(result).toContain("burst: 50");
    });
  });
});
