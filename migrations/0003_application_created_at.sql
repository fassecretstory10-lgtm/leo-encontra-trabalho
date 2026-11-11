ALTER TABLE applications ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS applications_created_idx ON applications(created_at);
