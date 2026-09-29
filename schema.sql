-- Evenly: gedeelde kosten per groep. Bedragen in de kleinste munteenheid (centen), als INTEGER.
CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,          -- 10 tekens, [a-z0-9], willekeurig
  title       TEXT NOT NULL,             -- max 80 tekens, getrimd
  currency    TEXT NOT NULL,             -- ISO 4217, bv. 'EUR'
  visits      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,             -- ISO-8601 UTC
  last_activity_at TEXT                  -- laatste wijziging of bezoek; NULL = zie created_at
);

CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- zoals getypt, getrimd, max 40
  name_key    TEXT NOT NULL,             -- genormaliseerd: lowercase, meervoudige spaties -> 1
  created_at  TEXT NOT NULL,
  deleted_at  TEXT,                      -- NULL = actief; anders weggehaald (30 dagen zichtbaar als info)
  UNIQUE (group_id, name_key)
);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,             -- max 80
  amount      INTEGER NOT NULL,          -- totaal, in centen, > 0
  paid_by     TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,             -- 'YYYY-MM-DD'
  split       TEXT NOT NULL,             -- 'equal' | 'exact' | 'shares' (hoe de aandelen berekend zijn)
  created_at  TEXT NOT NULL,
  updated_at  TEXT,
  deleted_at  TEXT                       -- NULL = actief; zacht verwijderd blijft 30 dagen herstelbaar
);

-- Wie welk deel van een uitgave draagt. Som van share = expenses.amount.
CREATE TABLE IF NOT EXISTS expense_shares (
  expense_id  TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  share       INTEGER NOT NULL,          -- centen, >= 0
  weight      INTEGER,                   -- bij split='shares': het opgegeven aantal delen
  PRIMARY KEY (expense_id, member_id)
);

-- Een betaling tussen twee leden ("Ali heeft Sofie 20 betaald").
CREATE TABLE IF NOT EXISTS settlements (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,          -- centen, > 0
  date        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  deleted_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_shares_member ON expense_shares(member_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_activity ON groups(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_members_deleted ON members(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at);
