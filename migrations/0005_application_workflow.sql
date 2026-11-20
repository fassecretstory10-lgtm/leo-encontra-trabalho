ALTER TABLE applications ADD COLUMN followup_at TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN next_action TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS applications_followup_idx ON applications(followup_at);