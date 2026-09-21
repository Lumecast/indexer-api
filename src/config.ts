import "dotenv/config";

export const DEFAULT_PASSPHRASE = "Test SDF Network ; September 2015";
export const DEFAULT_PORT = 8080;

export interface Config {
  databaseUrl: string;
  sorobanRpcUrl?: string;
  marketContractId?: string;
  networkPassphrase: string;
  port: number;
  redisUrl?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    databaseUrl: env.DATABASE_URL ?? "",
    sorobanRpcUrl: env.SOROBAN_RPC_URL || undefined,
    marketContractId: env.MARKET_CONTRACT_ID || undefined,
    networkPassphrase: env.NETWORK_PASSPHRASE ?? DEFAULT_PASSPHRASE,
    port: Number(env.PORT ?? DEFAULT_PORT),
    redisUrl: env.REDIS_URL || undefined,
  };
}