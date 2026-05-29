-- Fix chat creation failing after tables exist (RLS chicken-and-egg).
-- Run this in Supabase SQL editor if group/DM creation still fails.
-- Safe to re-run. Does NOT drop tables or data.

DROP POLICY IF EXISTS chat_conv_select ON chat_conversations;
CREATE POLICY chat_conv_select ON chat_conversations
  FOR SELECT USING (
    public.is_chat_participant(id, auth.uid())
    OR created_by = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message_reactions TO authenticated;

NOTIFY pgrst, 'reload schema';
