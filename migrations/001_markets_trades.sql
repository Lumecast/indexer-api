-- 001_markets_trades.sql
-- M0 database schema v1 (part 1/2): markets and trades.

CREATE TABLE markets (
    id              TEXT PRIMARY KEY,             -- on-chain market id
    contract_id     TEXT NOT NULL,                -- Lumecast market contract address
    category        TEXT,
    question        TEXT NOT NULL,
    description     TEXT,
    oracle          TEXT,                         -- resolver oracle address
    status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created', 'active', 'proposed', 'disputed', 'finalized', 'claimed')),
    volume          BIGINT NOT NULL DEFAULT 0,    -- total volume, in stroops
    close_time      TIMESTAMPTZ,
    resolved_outcome TEXT,
    source_ledger   BIGINT,
    source_tx_hash  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_markets_status ON markets (status);
CREATE INDEX idx_markets_close_time ON markets (close_time);
CREATE INDEX idx_markets_category ON markets (category);
CREATE INDEX idx_markets_contract_id ON markets (contract_id);

CREATE TABLE trades (
    id              BIGSERIAL PRIMARY KEY,
    market_id       TEXT NOT NULL REFERENCES markets (id) ON DELETE CASCADE,
    event_id        TEXT NOT NULL UNIQUE,         -- on-chain event id, for idempotent ingestion
    account_address TEXT NOT NULL,
    side            TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    outcome         TEXT NOT NULL,                -- outcome identifier, e.g. "yes"/"no"
    shares          BIGINT NOT NULL CHECK (shares >= 0),
    price           BIGINT NOT NULL CHECK (price >= 0),    -- price per share, in stroops
    amount          BIGINT NOT NULL CHECK (amount >= 0),
    ledger_seq      BIGINT NOT NULL,
    tx_hash         TEXT NOT NULL,
    ledger_close_at TIMESTAMPTZ NOT NULL,         -- ledger close time (chain timestamp)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_market_time ON trades (market_id, ledger_close_at DESC);
CREATE INDEX idx_trades_account ON trades (account_address);
CREATE INDEX idx_trades_market_outcome ON trades (market_id, outcome);