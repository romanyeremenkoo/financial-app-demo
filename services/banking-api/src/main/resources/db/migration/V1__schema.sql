-- Financial App — Banking API schema.
-- All monetary values are integer minor units. Domain enums are stored as their
-- lowercase wire values and guarded by CHECK constraints.

CREATE TABLE account (
    id              VARCHAR(64)  PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    type            VARCHAR(16)  NOT NULL,
    masked_iban     VARCHAR(64)  NOT NULL,
    currency        VARCHAR(3)   NOT NULL,
    balance_minor   BIGINT       NOT NULL,
    available_minor BIGINT       NOT NULL,
    status          VARCHAR(16)  NOT NULL,
    sort_order      INTEGER      NOT NULL,
    version         BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT account_type_chk     CHECK (type IN ('current', 'savings', 'joint')),
    CONSTRAINT account_currency_chk CHECK (currency IN ('EUR', 'GBP')),
    CONSTRAINT account_status_chk   CHECK (status IN ('active', 'closed'))
);

CREATE TABLE card (
    id            VARCHAR(64)  PRIMARY KEY,
    account_id    VARCHAR(64)  NOT NULL,
    label         VARCHAR(120) NOT NULL,
    holder_name   VARCHAR(120) NOT NULL,
    masked_number VARCHAR(32)  NOT NULL,
    expiry        VARCHAR(5)   NOT NULL,
    network       VARCHAR(16)  NOT NULL,
    status        VARCHAR(16)  NOT NULL,
    CONSTRAINT card_account_fk  FOREIGN KEY (account_id) REFERENCES account (id),
    CONSTRAINT card_network_chk CHECK (network IN ('visa', 'mastercard')),
    CONSTRAINT card_status_chk  CHECK (status IN ('active', 'frozen')),
    CONSTRAINT card_expiry_chk  CHECK (expiry ~ '^(0[1-9]|1[0-2])/[0-9]{2}$')
);

CREATE INDEX idx_card_account_id ON card (account_id);

CREATE TABLE transfer (
    id                     VARCHAR(64)  PRIMARY KEY,
    source_account_id      VARCHAR(64)  NOT NULL,
    destination_account_id VARCHAR(64)  NOT NULL,
    amount_minor           BIGINT       NOT NULL,
    currency               VARCHAR(3)   NOT NULL,
    reference              VARCHAR(140),
    created_at             TIMESTAMPTZ  NOT NULL,
    debit_transaction_id   VARCHAR(64)  NOT NULL,
    credit_transaction_id  VARCHAR(64)  NOT NULL,
    CONSTRAINT transfer_source_fk      FOREIGN KEY (source_account_id) REFERENCES account (id),
    CONSTRAINT transfer_destination_fk FOREIGN KEY (destination_account_id) REFERENCES account (id),
    CONSTRAINT transfer_amount_chk     CHECK (amount_minor > 0),
    CONSTRAINT transfer_currency_chk   CHECK (currency IN ('EUR', 'GBP')),
    CONSTRAINT transfer_distinct_chk   CHECK (source_account_id <> destination_account_id)
);

CREATE TABLE transaction (
    id           VARCHAR(64)  PRIMARY KEY,
    account_id   VARCHAR(64)  NOT NULL,
    counterparty VARCHAR(160) NOT NULL,
    category     VARCHAR(20)  NOT NULL,
    booked_at    TIMESTAMPTZ  NOT NULL,
    amount_minor BIGINT       NOT NULL,
    currency     VARCHAR(3)   NOT NULL,
    direction    VARCHAR(8)   NOT NULL,
    status       VARCHAR(12)  NOT NULL,
    reference    VARCHAR(160),
    transfer_id  VARCHAR(64),
    CONSTRAINT transaction_account_fk   FOREIGN KEY (account_id) REFERENCES account (id),
    CONSTRAINT transaction_amount_chk   CHECK (amount_minor > 0),
    CONSTRAINT transaction_currency_chk CHECK (currency IN ('EUR', 'GBP')),
    CONSTRAINT transaction_direction_chk CHECK (direction IN ('debit', 'credit')),
    CONSTRAINT transaction_status_chk   CHECK (status IN ('completed', 'pending', 'failed')),
    CONSTRAINT transaction_category_chk CHECK (category IN (
        'groceries', 'dining', 'transport', 'housing', 'utilities',
        'shopping', 'health', 'entertainment', 'income', 'transfer'))
);

CREATE INDEX idx_transaction_account_id ON transaction (account_id);
CREATE INDEX idx_transaction_booked_at  ON transaction (booked_at);
CREATE INDEX idx_transaction_transfer_id ON transaction (transfer_id);

-- The transfer's ledger links are validated only after both legs are inserted.
ALTER TABLE transfer
    ADD CONSTRAINT transfer_debit_txn_fk FOREIGN KEY (debit_transaction_id)
        REFERENCES transaction (id) DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT transfer_credit_txn_fk FOREIGN KEY (credit_transaction_id)
        REFERENCES transaction (id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE idempotency_record (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    fingerprint     VARCHAR(64)  NOT NULL,
    transfer_id     VARCHAR(64)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT idempotency_transfer_fk FOREIGN KEY (transfer_id) REFERENCES transfer (id)
);

CREATE UNIQUE INDEX uq_idempotency_key ON idempotency_record (idempotency_key);
