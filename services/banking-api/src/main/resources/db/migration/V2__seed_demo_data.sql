-- Deterministic fictional demo data for the "Elena Vasquez" persona, matching the
-- frontends' demo dataset. Dates are relative to CURRENT_DATE so the history always
-- looks recent. Flyway runs this once, so restarts never duplicate rows.

INSERT INTO account (id, name, type, masked_iban, currency, balance_minor, available_minor, status, sort_order, version) VALUES
    ('acc-current', 'Everyday Current', 'current', 'IE29 •••• •••• 4471', 'EUR', 318540, 318540, 'active', 1, 0),
    ('acc-savings', 'Reserve Savings', 'savings', 'IE64 •••• •••• 1902', 'EUR', 1284000, 1284000, 'active', 2, 0),
    ('acc-joint',   'Household Joint',  'joint',   'IE11 •••• •••• 7765', 'EUR', 141880, 141880, 'active', 3, 0);

INSERT INTO card (id, account_id, label, holder_name, masked_number, expiry, network, status) VALUES
    ('card-everyday',  'acc-current', 'Everyday virtual card',  'Elena Vasquez', '•••• •••• •••• 4218', '09/29', 'visa',       'active'),
    ('card-household', 'acc-joint',   'Household virtual card',  'Elena Vasquez', '•••• •••• •••• 7703', '04/28', 'mastercard', 'frozen');

-- Six months of recurring statement history. Amounts vary deterministically per
-- month via hashtext, mirroring the frontends' FNV-based variation.
INSERT INTO transaction (id, account_id, counterparty, category, booked_at, amount_minor, currency, direction, status, reference, transfer_id)
WITH months AS (
    SELECT gs AS month_offset,
           date_trunc('month', CURRENT_DATE) - make_interval(months => gs) AS month_start
    FROM generate_series(0, 5) AS gs
),
templates (key, account_id, counterparty, category, direction, day, base, variation, reference) AS (
    VALUES
        ('salary',              'acc-current', 'Northwind Analytics', 'income',        'credit', 25, 325000, 0,  'Monthly salary'),
        ('rent',                'acc-current', 'Baumann Immobilien',  'housing',       'debit',   3, 118000, 0,  'Rent'),
        ('energy',              'acc-joint',   'Vattenfall Energie',  'utilities',     'debit',   8,   7490, 18, NULL),
        ('broadband',           'acc-joint',   'KPN Broadband',       'utilities',     'debit',  11,   4250, 0,  NULL),
        ('groceries-ah',        'acc-current', 'Albert Heijn',        'groceries',     'debit',   5,   6235, 22, NULL),
        ('groceries-lidl',      'acc-joint',   'Lidl',                'groceries',     'debit',  12,   3820, 25, NULL),
        ('groceries-carrefour', 'acc-current', 'Carrefour',           'groceries',     'debit',  21,   5480, 20, NULL),
        ('coffee',              'acc-current', 'Café Mokka',          'dining',        'debit',   7,   1260, 30, NULL),
        ('restaurant',          'acc-current', 'Trattoria Verdi',     'dining',        'debit',  18,   4800, 28, NULL),
        ('rail',                'acc-current', 'NS Rail',             'transport',     'debit',   9,   3200, 15, NULL),
        ('ride',                'acc-current', 'Bolt Ride',           'transport',     'debit',  16,   1475, 35, NULL),
        ('fashion',             'acc-current', 'Zalando',             'shopping',      'debit',  14,   8999, 40, NULL),
        ('streaming',           'acc-current', 'Spotify',             'entertainment', 'debit',   2,   1099, 0,  NULL),
        ('cinema',              'acc-current', 'Pathé Cinema',        'entertainment', 'debit',  22,   2400, 20, NULL),
        ('pharmacy',            'acc-current', 'Apotheek Centraal',   'health',        'debit',  19,   2740, 30, NULL),
        ('interest',            'acc-savings', 'Savings Interest',    'income',        'credit', 28,   1120, 12, 'Monthly interest')
)
SELECT
    'txn-' || to_char(m.month_start, 'YYYY-MM') || '-' || t.key,
    t.account_id,
    t.counterparty,
    t.category,
    (m.month_start + make_interval(days => t.day - 1, hours => 9 + (t.day % 8))) AT TIME ZONE 'UTC',
    CASE
        WHEN t.variation = 0 THEN t.base::bigint
        ELSE GREATEST(1, round(
            t.base * (1 + (((abs(hashtext(t.key || ':' || to_char(m.month_start, 'YYYY-MM'))::bigint) % 1000)::numeric / 1000) * 2 - 1)
                          * t.variation / 100.0)))::bigint
    END,
    'EUR',
    t.direction,
    'completed',
    t.reference,
    NULL
FROM months m
CROSS JOIN templates t
WHERE (m.month_start + make_interval(days => t.day - 1, hours => 9 + (t.day % 8))) AT TIME ZONE 'UTC' <= now();

-- Non-final-state entries on the current account: one pending hold, one failed charge.
INSERT INTO transaction (id, account_id, counterparty, category, booked_at, amount_minor, currency, direction, status, reference, transfer_id) VALUES
    ('txn-pending-car-hire',    'acc-current', 'Hertz Autovermietung', 'transport', now() + make_interval(days => -1), 15000, 'EUR', 'debit', 'pending', 'Authorisation hold', NULL),
    ('txn-failed-subscription', 'acc-current', 'Nimbus Cloud Storage', 'shopping',  now() + make_interval(days => -4),  1999, 'EUR', 'debit', 'failed',  'Card declined',       NULL);

-- Derive balances from the opening balance plus every completed entry; available
-- funds additionally reserve pending debit holds.
UPDATE account a
SET balance_minor   = o.opening + COALESCE(c.completed_sum, 0),
    available_minor = o.opening + COALESCE(c.completed_sum, 0) - COALESCE(p.pending_holds, 0)
FROM (VALUES
        ('acc-current', 318540::bigint),
        ('acc-savings', 1284000::bigint),
        ('acc-joint',   141880::bigint)
     ) AS o(id, opening)
LEFT JOIN (
    SELECT account_id,
           SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE -amount_minor END) AS completed_sum
    FROM transaction
    WHERE status = 'completed'
    GROUP BY account_id
) c ON c.account_id = o.id
LEFT JOIN (
    SELECT account_id, SUM(amount_minor) AS pending_holds
    FROM transaction
    WHERE status = 'pending' AND direction = 'debit'
    GROUP BY account_id
) p ON p.account_id = o.id
WHERE a.id = o.id;
