# Lumecast Indexer API — Project Plan

## 1. Purpose
An off-chain service that watches the Stellar ledger for Lumecast contract events, indexes them into a queryable database, and serves that data via an API to the frontend (and eventually to third parties — e.g. analytics dashboards, other apps building on Lumecast data). This exists because querying full market/trade history directly from the ledger is slow, expensive, and not built for the access patterns a UI needs (pagination, filtering, aggregation, price history charts).

## 2. Scope
In scope:
- Ledger ingestion: subscribe to/poll Soroban events emitted by the market contract
- Data model: markets, trades/deposits, positions, resolutions, disputes
- Query API: REST (or GraphQL — see open question) for the frontend to consume
- Price/odds history aggregation (for charting)
- Admin/resolver action feed (for audit/transparency — "what happened and when" per market)

Out of scope:
- Any fund custody or transaction signing (this service is read-only relative to the chain — it never holds keys that can move funds)
- On-chain logic → `contracts`
- UI → `frontend`

## 3. Milestones

### M0 — Foundations (Week 1-2)
- Repo scaffold, language/framework choice finalized (see decisions table)
- Database schema v1: `markets`, `trades`, `positions`, `resolutions`
- CI: lint, test, build

### M1 — Ledger Ingestion (Week 2-4)
- Soroban RPC event subscription/polling worker
- Parse and persist `MarketCreated`, `SharesBought`, `SharesSold`, `OutcomeProposed`, `Disputed`, `Finalized`, `Claimed` events
- Idempotent ingestion (safe to replay/restart without duplicating data)
- Reorg handling (if applicable at the Stellar consensus layer — confirm finality model)

### M2 — Query API v1 (Week 4-6)
- `GET /markets` — list with filters (status, category, sort by volume/close time)
- `GET /markets/:id` — market detail, including current odds
- `GET /markets/:id/history` — price/odds history for charting
- `GET /markets/:id/trades` — trade feed
- `GET /accounts/:address/positions` — a user's positions across markets
- OpenAPI spec published alongside the API

### M3 — Aggregation & Performance (Week 6-8)
- Materialized views or scheduled jobs for expensive aggregates (volume, odds history buckets)
- Caching layer (Redis or similar) for hot endpoints
- Load testing against expected launch traffic

### M4 — Real-Time Layer (Week 8-9)
- Evaluate: websockets/SSE for live odds updates vs. frontend polling
- If justified by UX needs from `frontend` M2, implement a subscription endpoint

### M5 — Observability & Hardening (Week 9-11)
- Structured logging, metrics (ingestion lag, API latency, error rates)
- Alerting on ingestion falling behind chain head
- Rate limiting on public endpoints

### M6 — Testnet Beta (Week 11-12)
- Run against testnet alongside `contracts` and `frontend` betas
- Validate data correctness against ledger ground truth (spot-check trades)

### M7 — Mainnet Launch (Week 12+)
- Point at mainnet Soroban RPC
- Backfill from mainnet contract genesis if contracts were deployed before indexer went live
- Monitoring dashboards live before traffic is routed

## 4. Key Design Decisions (and why)

| Decision | Choice | Rationale |
|---|---|---|
| Language/framework | TBD — Node.js/TypeScript (shared types with frontend) or Rust (shared idioms with contracts) | Pick based on team's stronger runtime skill; Node.js lowers the barrier for frontend devs to contribute to the API |
| Database | Postgres | Relational model fits markets/trades/positions well; strong support for time-series-ish queries via indexing |
| API style | REST v1, evaluate GraphQL later | REST is simpler to cache, document, and consume for a v1 with known access patterns |
| Ingestion strategy | Poll Soroban RPC for events (vs. running a full validator) | Lower infra burden to start; revisit if latency/reliability becomes a problem |
| Read-only guarantee | This service never holds signing keys | Keeps the blast radius of an indexer compromise limited to data integrity, not fund loss |

## 5. Risks & Open Questions
- **Finality/reorg model**: Confirm how Stellar Soroban's consensus finality works in practice — does the indexer need reorg-handling logic, or is finality effectively immediate? This affects M1 design.
- **REST vs GraphQL**: Revisit once frontend data needs stabilize — if the frontend ends up needing many bespoke aggregate views, GraphQL might reduce backend endpoint sprawl.
- **Data availability for third parties**: If Lumecast wants to support external dashboards/analytics later, consider API key auth and rate tiers from the start rather than retrofitting.
- **Backfill cost**: If ingestion starts after contracts have already seen mainnet activity, backfilling full history from RPC needs a plan (may need archival RPC access).

## 6. Definition of Done (per milestone)
A milestone is done when: ingestion is verified correct against a sample of manually-checked on-chain events, API endpoints have OpenAPI docs, and a basic load test confirms the service handles at least 10x expected launch traffic without degradation.