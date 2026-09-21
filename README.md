# Lumecast Indexer API

An off-chain indexing service and query API for **Lumecast**, a prediction market platform built on Stellar/Soroban. It watches the ledger for Lumecast contract events, stores them in a queryable database, and exposes an API consumed by [`lumecast/frontend`](https://github.com/lumecast/frontend) (and potentially third-party integrations later).

> This service is **read-only** with respect to the chain — it never holds keys capable of moving funds. All fund custody and settlement logic lives in [`lumecast/contracts`](https://github.com/lumecast/contracts).

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Repo Structure](#repo-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deploying](#deploying)
- [Contributing](#contributing)
- [License](#license)

## Overview

Querying full market and trade history directly from the Stellar ledger isn't practical for the access patterns a UI needs — pagination, filtering, sorting by volume, price-history charts. This service solves that by:

1. **Ingesting** — subscribing to/polling Soroban RPC for events emitted by the Lumecast market contract
2. **Storing** — persisting a normalized view of markets, trades, positions, and resolutions in Postgres
3. **Serving** — exposing that data over a REST API

## Architecture

```
┌──────────────────┐
│  Soroban RPC       │
│  (Stellar ledger)  │
└─────────┬──────────┘
          │ events
          ▼
┌──────────────────┐        ┌──────────────┐
│  Ingestion Worker  │ ───►  │  Postgres     │
│  (polls/subscribes)│       │  (markets,    │
└──────────────────┘        │   trades,     │
                              │   positions)  │
                              └───────┬──────┘
                                       │
                                       ▼
                              ┌──────────────┐
                              │   Query API    │
                              │   (REST)       │
                              └───────┬──────┘
                                       │
                                       ▼
                              lumecast/frontend
```

## Repo Structure

```
indexer-api/
├── src/
│   ├── ingestion/      # RPC event polling/subscription, parsers per event type
│   ├── db/              # Schema, migrations, query layer
│   ├── api/               # Route handlers, OpenAPI spec
│   └── jobs/               # Scheduled aggregation jobs
├── migrations/
├── tests/
├── PLAN.md
└── README.md
```

## Prerequisites

- Runtime: Node.js 20+ (language decision finalized: **TypeScript on Node.js** — see [PLAN.md](./PLAN.md) decision table)
- Postgres 15+
- Access to a Soroban RPC endpoint (testnet or mainnet)

## Getting Started

```bash
git clone https://github.com/lumecast/indexer-api.git
cd indexer-api
npm install   # or cargo build, depending on finalized stack

cp .env.example .env
# edit .env — see Environment Variables below

# Run migrations
npm run migrate

# Start ingestion worker + API server
npm run dev
```

The API runs at `http://localhost:8080` by default; see `/docs` for the OpenAPI UI once running.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint to ingest from |
| `MARKET_CONTRACT_ID` | Deployed address of the Lumecast market contract to watch |
| `NETWORK_PASSPHRASE` | Stellar network passphrase (testnet/mainnet) |
| `PORT` | Port for the API server |
| `REDIS_URL` | (Optional, M3+) cache layer connection string |

See `.env.example` for the full list with defaults.

## API Reference

| Endpoint | Description |
|---|---|
| `GET /markets` | List markets, filterable by status/category, sortable by volume/close time |
| `GET /markets/:id` | Market detail including current odds |
| `GET /markets/:id/history` | Price/odds history for charting |
| `GET /markets/:id/trades` | Trade feed for a market |
| `GET /accounts/:address/positions` | A wallet's positions across all markets |

Full request/response schemas are published as an OpenAPI spec at `/docs` when the server is running.

## Testing

```bash
npm run test              # Unit tests
npm run test:integration   # Requires a local Postgres + testnet RPC access
```

CI runs lint, unit tests, and build on every PR. Integration tests run against a containerized Postgres in CI.

## Deploying

The service ships as a container (see `Dockerfile`). Deploy the ingestion worker and API server as separate processes/containers so ingestion lag doesn't affect API availability, or vice versa.

```bash
docker build -t lumecast-indexer-api .
docker run --env-file .env lumecast-indexer-api
```

## Contributing

1. Branch from `main`
2. New event types must include a parser, a migration (if schema changes), and a test with a sample event payload
3. New API endpoints must include OpenAPI documentation
4. Run `npm run lint && npm run test` before opening a PR

## License

MIT
