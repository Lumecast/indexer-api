import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./api/health.js";
import { type Config, loadConfig } from "./config.js";

export interface Server {
  app: FastifyInstance;
  config: Config;
}

export async function buildServer(env: NodeJS.ProcessEnv = process.env): Promise<Server> {
  const config = loadConfig(env);
  const app = Fastify({ logger: true });
  await app.register(healthRoutes);
  await app.ready();
  return { app, config };
}

async function main(): Promise<void> {
  const { app, config } = await buildServer();
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}