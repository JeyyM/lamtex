-- Add group avatar and message pinning support
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quickly fetching pinned messages per conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
  ON chat_messages (conversation_id, pinned)
  WHERE pinned = TRUE;
