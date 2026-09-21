-- 002_positions_resolutions.sql
-- M0 database schema v1 (part 2/2): positions and resolutions.

-- A user's holdings in a market/outcome, kept up to date by the ingestion worker.
-- Unique per (market, account, outcome); trades upsert this table as they land.
CREATE TABLE positions (
    id              BIGSERIAL PRIMARY KEY,
    market_id       TEXT NOT NULL REFERENCES markets (id) ON DELETE CASCADE,
    account_address TEXT NOT NULL,
    outcome         TEXT NOT NULL,
    shares          BIGINT NOT NULL DEFAULT 0 CHECK (shares >= 0),
    avg_price       BIGINT NOT NULL DEFAULT 0 CHECK (avg_price >= 0),  -- average cost, in stroops
    realized_pnl    BIGINT NOT NULL DEFAULT 0,                          -- in stroops
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (market_id, account_address, outcome)
);

CREATE INDEX idx_positions_account ON positions (account_address);
CREATE INDEX idx_positions_market ON positions (market_id);

-- Resolution/dispute audit trail per market: who proposed/finalized what, when.
CREATE TABLE resolutions (
    id               BIGSERIAL PRIMARY KEY,
    market_id        TEXT NOT NULL REFERENCES markets (id) ON DELETE CASCADE,
    kind             TEXT NOT NULL CHECK (kind IN ('proposed', 'disputed', 'finalized', 'claimed')),
    outcome          TEXT NOT NULL,
    actor_address    TEXT NOT NULL,
    ledger_seq       BIGINT NOT NULL,
    tx_hash          TEXT NOT NULL,
    event_id         TEXT NOT NULL UNIQUE,         -- on-chain event id, for idempotent ingestion
    ledger_close_at  TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resolutions_market ON resolutions (market_id, ledger_seq DESC);
CREATE INDEX idx_resolutions_kind ON resolutions (kind);