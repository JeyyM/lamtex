-- Track who sent the latest message so the chat sidebar can show "Joe: Hey".

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS last_message_sender_id UUID;

-- Backfill from the most recent non-deleted message per conversation.
UPDATE public.chat_conversations c
SET last_message_sender_id = m.sender_id
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    sender_id
  FROM public.chat_messages
  WHERE deleted = FALSE
  ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id
  AND c.last_message_sender_id IS DISTINCT FROM m.sender_id;

CREATE OR REPLACE FUNCTION public.trg_chat_message_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv        chat_conversations%ROWTYPE;
  sender_name TEXT;
  preview     TEXT;
  title_text  TEXT;
  part        RECORD;
BEGIN
  SELECT * INTO conv FROM chat_conversations WHERE id = NEW.conversation_id;

  SELECT employee_name INTO sender_name
  FROM employees WHERE auth_user_id = NEW.sender_id LIMIT 1;
  sender_name := COALESCE(NULLIF(TRIM(sender_name), ''), 'Someone');

  IF NEW.content IS NOT NULL AND TRIM(NEW.content) <> '' THEN
    preview := LEFT(NEW.content, 140);
  ELSIF jsonb_array_length(NEW.attachments) > 0 THEN
    preview := '📎 Attachment';
  ELSE
    preview := 'New message';
  END IF;

  UPDATE chat_conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = preview,
      last_message_sender_id = NEW.sender_id,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  IF conv.type = 'group' THEN
    title_text := COALESCE(NULLIF(TRIM(conv.name), ''), 'Group chat') || ' · ' || sender_name;
  ELSE
    title_text := sender_name;
  END IF;

  FOR part IN
    SELECT user_id FROM chat_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent,
      action_url, action_label, metadata, event_type
    ) VALUES (
      part.user_id, 'Message'::notification_category, title_text, preview, FALSE,
      '/chats/' || NEW.conversation_id::text, 'Open chat',
      jsonb_build_object('conversationId', NEW.conversation_id, 'messageId', NEW.id,
                         'senderId', NEW.sender_id, 'senderName', sender_name),
      'chat_message'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
