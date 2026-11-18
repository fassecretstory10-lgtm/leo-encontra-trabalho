CREATE TABLE IF NOT EXISTS application_email_threads (
 id TEXT PRIMARY KEY,
 application_id TEXT,
 company TEXT NOT NULL DEFAULT '',
 role_title TEXT NOT NULL DEFAULT '',
 contact_email TEXT NOT NULL DEFAULT '',
 direction TEXT NOT NULL CHECK(direction IN ('outbound','inbound')),
 status TEXT NOT NULL DEFAULT 'needs_review',
 first_message_at TEXT,
 last_message_at TEXT,
 last_message_subject TEXT NOT NULL DEFAULT '',
 last_message_preview TEXT NOT NULL DEFAULT '',
 outlook_conversation_id TEXT,
 outlook_web_link TEXT NOT NULL DEFAULT '',
 match_confidence REAL NOT NULL DEFAULT 0,
 needs_review INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS application_email_messages (
 id TEXT PRIMARY KEY,
 thread_id TEXT NOT NULL,
 outlook_message_id TEXT NOT NULL UNIQUE,
 direction TEXT NOT NULL CHECK(direction IN ('outbound','inbound')),
 sender_email TEXT NOT NULL DEFAULT '',
 recipient_emails TEXT NOT NULL DEFAULT '',
 subject TEXT NOT NULL DEFAULT '',
 received_at TEXT,
 preview TEXT NOT NULL DEFAULT '',
 outlook_web_link TEXT NOT NULL DEFAULT '',
 classification TEXT NOT NULL DEFAULT 'unclassified',
 is_automated INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outlook_sync_state (
 mailbox_email TEXT PRIMARY KEY,
 last_sync_at TEXT,
 delta_link TEXT,
 sync_status TEXT NOT NULL DEFAULT 'not_connected',
 last_error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS app_email_threads_application_idx ON application_email_threads(application_id);
CREATE INDEX IF NOT EXISTS app_email_threads_last_message_idx ON application_email_threads(last_message_at);
CREATE INDEX IF NOT EXISTS app_email_threads_review_idx ON application_email_threads(needs_review,status);
CREATE INDEX IF NOT EXISTS app_email_messages_thread_idx ON application_email_messages(thread_id,received_at);
CREATE INDEX IF NOT EXISTS app_email_messages_classification_idx ON application_email_messages(classification);
