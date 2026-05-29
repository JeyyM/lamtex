-- ============================================================================
-- CHAT SYSTEM — conversations, participants, messages, reactions
-- Messenger-style internal team chat. Participant-scoped (you only see
-- conversations you're a member of). Attachments live in the existing public
-- `images` storage bucket under the `chat-attachments/` prefix.
--
-- Run in Supabase SQL editor. Idempotent. Mirrored into database/schema.sql.
-- ============================================================================

-- Clean slate: chat is a brand-new feature with no production data. Dropping
-- here repairs any earlier partial/mismatched attempt (e.g. tables created with
-- different column names) so the definitions below always apply cleanly.
-- CASCADE also removes the dependent policies/trigger/FKs.
DROP TABLE IF EXISTS chat_message_reactions CASCADE;
DROP TABLE IF EXISTS chat_messages          CASCADE;
DROP TABLE IF EXISTS chat_participants       CASCADE;
DROP TABLE IF EXISTS chat_conversations      CASCADE;

-- New notification category for chat messages (reuses the in-app bell + sound).
-- Kept as a top-level statement: ADD VALUE cannot run inside a DO/EXCEPTION
-- subtransaction. The value isn't consumed until the trigger fires later, so
-- this is safe in the same run. If 'Message' already exists this is a no-op.
ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'Message';

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name            TEXT,                                   -- group name (null for direct)
  created_by      UUID,                                   -- auth.users id of creator
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,                          -- auth.users id
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL,                          -- auth.users id
  content         TEXT,                                   -- nullable for attachment-only
  reply_to_id     UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  attachments     JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{url,name,type,size,kind,width,height}]
  link_preview    JSONB,                                  -- {url,title,description,image,siteName}
  edited          BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,                              -- auth.users id
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

-- ── Participant helper (SECURITY DEFINER avoids RLS recursion) ────────────────
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- ── Row Level Security (participant-scoped) ───────────────────────────────────
ALTER TABLE chat_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop any permissive blanket policies that may have been auto-created.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('chat_conversations','chat_participants','chat_messages','chat_message_reactions')
      AND policyname LIKE 'auth_%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- conversations
DROP POLICY IF EXISTS chat_conv_select ON chat_conversations;
CREATE POLICY chat_conv_select ON chat_conversations
  FOR SELECT USING (
    public.is_chat_participant(id, auth.uid())
    OR created_by = auth.uid()
  );
DROP POLICY IF EXISTS chat_conv_insert ON chat_conversations;
CREATE POLICY chat_conv_insert ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS chat_conv_update ON chat_conversations;
CREATE POLICY chat_conv_update ON chat_conversations
  FOR UPDATE USING (public.is_chat_participant(id, auth.uid()));

-- participants
DROP POLICY IF EXISTS chat_part_select ON chat_participants;
CREATE POLICY chat_part_select ON chat_participants
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_part_insert ON chat_participants;
CREATE POLICY chat_part_insert ON chat_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS chat_part_update ON chat_participants;
CREATE POLICY chat_part_update ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS chat_part_delete ON chat_participants;
CREATE POLICY chat_part_delete ON chat_participants
  FOR DELETE USING (user_id = auth.uid() OR public.is_chat_participant(conversation_id, auth.uid()));

-- messages
DROP POLICY IF EXISTS chat_msg_select ON chat_messages;
CREATE POLICY chat_msg_select ON chat_messages
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_msg_insert ON chat_messages;
CREATE POLICY chat_msg_insert ON chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_msg_update ON chat_messages;
CREATE POLICY chat_msg_update ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- reactions
DROP POLICY IF EXISTS chat_react_select ON chat_message_reactions;
CREATE POLICY chat_react_select ON chat_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_messages m
      WHERE m.id = message_id AND public.is_chat_participant(m.conversation_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS chat_react_insert ON chat_message_reactions;
CREATE POLICY chat_react_insert ON chat_message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS chat_react_delete ON chat_message_reactions;
CREATE POLICY chat_react_delete ON chat_message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER TABLE chat_messages          REPLICA IDENTITY FULL;
ALTER TABLE chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_participants      REPLICA IDENTITY FULL;
ALTER TABLE chat_conversations     REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_messages','chat_message_reactions','chat_participants','chat_conversations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ── New-message bookkeeping + bell notification (reuses notifications pipeline) ─
CREATE OR REPLACE FUNCTION public.trg_chat_message_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv          chat_conversations%ROWTYPE;
  sender_name   TEXT;
  preview       TEXT;
  title_text    TEXT;
  part          RECORD;
BEGIN
  SELECT * INTO conv FROM chat_conversations WHERE id = NEW.conversation_id;

  SELECT employee_name INTO sender_name
  FROM employees WHERE auth_user_id = NEW.sender_id
  LIMIT 1;
  sender_name := COALESCE(NULLIF(TRIM(sender_name), ''), 'Someone');

  -- Message preview for the conversation list + notification body
  IF NEW.content IS NOT NULL AND TRIM(NEW.content) <> '' THEN
    preview := LEFT(NEW.content, 140);
  ELSIF jsonb_array_length(NEW.attachments) > 0 THEN
    preview := '📎 Attachment';
  ELSE
    preview := 'New message';
  END IF;

  -- Keep conversation ordering + last preview fresh
  UPDATE chat_conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = preview,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Notification title: group name or sender (for direct)
  IF conv.type = 'group' THEN
    title_text := COALESCE(NULLIF(TRIM(conv.name), ''), 'Group chat') || ' · ' || sender_name;
  ELSE
    title_text := sender_name;
  END IF;

  -- One notification per other participant — bell badge + Alert sound
  FOR part IN
    SELECT user_id FROM chat_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent,
      action_url, action_label, metadata, event_type
    ) VALUES (
      part.user_id,
      'Message'::notification_category,
      title_text,
      preview,
      FALSE,
      '/chats/' || NEW.conversation_id::text,
      'Open chat',
      jsonb_build_object(
        'conversationId', NEW.conversation_id,
        'messageId', NEW.id,
        'senderId', NEW.sender_id,
        'senderName', sender_name
      ),
      'chat_message'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_after_insert ON chat_messages;
CREATE TRIGGER chat_message_after_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_chat_message_after_insert();

-- API access + PostgREST schema cache refresh
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message_reactions TO authenticated;

NOTIFY pgrst, 'reload schema';
