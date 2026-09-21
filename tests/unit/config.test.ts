import { describe, expect, it } from "vitest";
import { DEFAULT_PASSPHRASE, DEFAULT_PORT, loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  it("uses defaults for unset values", () => {
    const config = loadConfig({});
    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.networkPassphrase).toBe(DEFAULT_PASSPHRASE);
    expect(config.databaseUrl).toBe("");
    expect(config.sorobanRpcUrl).toBeUndefined();
    expect(config.marketContractId).toBeUndefined();
    expect(config.redisUrl).toBeUndefined();
  });

  it("reads values from the environment", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://user:pass@localhost:5432/lumecast",
      PORT: "9090",
      SOROBAN_RPC_URL: "https://rpc.example.com",
      MARKET_CONTRACT_ID: "C123",
      NETWORK_PASSPHRASE: "Test SDF Network",
      REDIS_URL: "redis://localhost:6379",
    });
    expect(config.databaseUrl).toBe("postgres://user:pass@localhost:5432/lumecast");
    expect(config.port).toBe(9090);
    expect(config.sorobanRpcUrl).toBe("https://rpc.example.com");
    expect(config.marketContractId).toBe("C123");
    expect(config.networkPassphrase).toBe("Test SDF Network");
    expect(config.redisUrl).toBe("redis://localhost:6379");
  });
});