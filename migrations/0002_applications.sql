CREATE TABLE IF NOT EXISTS applications (
 id TEXT PRIMARY KEY,
 job_id TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'interested',
 method TEXT NOT NULL DEFAULT 'unknown',
 applied_at TEXT,
 updated_at TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 cover_letter TEXT NOT NULL DEFAULT '',
 cv_version TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS saved_jobs (
 job_id TEXT PRIMARY KEY,
 saved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS application_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 application_id TEXT NOT NULL,
 old_status TEXT,
 new_status TEXT NOT NULL,
 changed_at TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS applications_updated_idx ON applications(updated_at);
