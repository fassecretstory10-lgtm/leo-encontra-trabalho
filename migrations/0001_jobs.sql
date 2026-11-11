CREATE TABLE IF NOT EXISTS jobs (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL,
 location TEXT NOT NULL DEFAULT '', work_mode TEXT NOT NULL DEFAULT '', salary TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '', url TEXT NOT NULL, posted_at TEXT, apply_url TEXT NOT NULL DEFAULT '',
 language TEXT NOT NULL DEFAULT '', first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, is_open INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sync_runs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, ran_at TEXT NOT NULL, source_count INTEGER NOT NULL,
 job_count INTEGER NOT NULL, error_count INTEGER NOT NULL, errors TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS source_sync (source TEXT PRIMARY KEY,last_run TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_posted_idx ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs(source,source_id);