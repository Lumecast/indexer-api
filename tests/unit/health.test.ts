import { describe, expect, it } from "vitest";
import { buildServer } from "../../src/server.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const { app } = await buildServer({ PORT: "0" });
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: "ok" });
    } finally {
      await app.close();
    }
  });
});