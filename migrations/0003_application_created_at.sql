ALTER TABLE applications ADD COLUMN created_at TEXT NOT NULL DEFAULT '2026-11-11T00:00:00.000Z';
CREATE INDEX IF NOT EXISTS applications_created_idx ON applications(created_at);
