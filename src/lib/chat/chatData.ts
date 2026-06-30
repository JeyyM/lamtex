import { supabase } from '@/src/lib/supabase';
import { notifyFetch } from '@/src/lib/notifyApi';
import type {
  Chat,
  ChatMessage,
  ChatUser,
  ChatAttachment,
  ChatLinkPreview,
} from '@/src/types/chat';

const STORAGE_BUCKET = 'images';
const CHAT_ATTACHMENT_FOLDER = 'chat-attachments';

// ---------------------------------------------------------------------------
// Directory (who you can start chats with)
// ---------------------------------------------------------------------------

/** Active employees that have a login (auth_user_id) — candidates for chats. */
export async function fetchChatDirectory(excludeUserId?: string | null): Promise<ChatUser[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('auth_user_id, employee_name, role, branches(name)')
    .not('auth_user_id', 'is', null)
    .eq('status', 'active')
    .order('employee_name');
  if (error) {
    console.warn('[chat] fetchChatDirectory', error);
    return [];
  }
  return (data ?? [])
    .map((r) => {
      const raw = r as Record<string, unknown>;
      const branchJoin = raw.branches as { name: string } | { name: string }[] | null;
      const branch = Array.isArray(branchJoin) ? branchJoin[0]?.name : branchJoin?.name;
      return {
        id: String(raw.auth_user_id),
        name: String(raw.employee_name ?? 'Unknown'),
        role: String(raw.role ?? ''),
        branch: branch ?? '',
        status: 'offline' as const,
      };
    })
    .filter((u) => u.id && u.id !== excludeUserId);
}

// ---------------------------------------------------------------------------
// Conversations list
// ---------------------------------------------------------------------------

interface ParticipantRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  role: 'admin' | 'member';
}

/** Build the conversation list (with members, last message preview, unread count). */
export async function fetchConversations(userId: string): Promise<Chat[]> {
  // 1. Conversations I'm in
  const { data: myParts, error: partErr } = await supabase
    .from('chat_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);
  if (partErr || !myParts || myParts.length === 0) return [];

  const convIds = myParts.map((p) => p.conversation_id as string);
  const myReadByConv = new Map<string, string>(
    myParts.map((p) => [p.conversation_id as string, p.last_read_at as string]),
  );

  // 2. Conversation records
  const { data: convs, error: convErr } = await supabase
    .from('chat_conversations')
    .select('id, type, name, avatar_url, created_by, last_message_at, last_message_preview, created_at')
    .in('id', convIds)
    .order('last_message_at', { ascending: false });
  if (convErr || !convs) return [];

  // 3. All participants of those conversations
  const { data: allParts } = await supabase
    .from('chat_participants')
    .select('conversation_id, user_id, last_read_at, role')
    .in('conversation_id', convIds);
  const participantsByConv = new Map<string, ParticipantRow[]>();
  for (const p of (allParts ?? []) as ParticipantRow[]) {
    const list = participantsByConv.get(p.conversation_id) ?? [];
    list.push(p);
    participantsByConv.set(p.conversation_id, list);
  }

  // 4. Resolve member display info from employees
  const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id as string)));
  const directory = await fetchUsersByAuthIds(userIds);

  // 5. Unread counts — messages after my last_read_at, not mine
  const unreadByConv = await fetchUnreadCounts(userId, convIds, myReadByConv);

  return convs.map((c) => {
    const cRaw = c as Record<string, unknown>;
    const convId = String(cRaw.id);
    const members: ChatUser[] = (participantsByConv.get(convId) ?? []).map((p) => {
      const base = directory.get(p.user_id) ?? {
        id: p.user_id,
        name: 'Unknown',
        role: '',
        branch: '',
        status: 'offline' as const,
      };
      return { ...base, chatRole: p.role };
    });
    const preview = (cRaw.last_message_preview as string) ?? '';
    return {
      id: convId,
      name: (cRaw.name as string) ?? '',
      type: (cRaw.type as 'direct' | 'group') ?? 'direct',
      members,
      lastMessage: preview
        ? {
            content: preview,
            timestamp: String(cRaw.last_message_at),
            senderId: '',
          }
        : undefined,
      unreadCount: unreadByConv.get(convId) ?? 0,
      createdAt: String(cRaw.created_at),
      createdBy: String(cRaw.created_by ?? ''),
      avatarUrl: (cRaw.avatar_url as string | null) ?? undefined,
    };
  });
}

async function fetchUnreadCounts(
  userId: string,
  convIds: string[],
  readByConv: Map<string, string>,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  // Per-conversation head count of messages newer than last_read_at and not mine.
  await Promise.all(
    convIds.map(async (convId) => {
      const lastRead = readByConv.get(convId) ?? '1970-01-01';
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .neq('sender_id', userId)
        .eq('deleted', false)
        .gt('created_at', lastRead);
      result.set(convId, count ?? 0);
    }),
  );
  return result;
}

/** Map auth_user_id → ChatUser using the employees directory. */
export async function fetchUsersByAuthIds(authIds: string[]): Promise<Map<string, ChatUser>> {
  const map = new Map<string, ChatUser>();
  if (authIds.length === 0) return map;
  const { data } = await supabase
    .from('employees')
    .select('auth_user_id, employee_name, role, branches(name)')
    .in('auth_user_id', authIds);
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const branchJoin = r.branches as { name: string } | { name: string }[] | null;
    const branch = Array.isArray(branchJoin) ? branchJoin[0]?.name : branchJoin?.name;
    const id = String(r.auth_user_id);
    map.set(id, {
      id,
      name: String(r.employee_name ?? 'Unknown'),
      role: String(r.role ?? ''),
      branch: branch ?? '',
      status: 'offline',
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  reply_to_id: string | null;
  attachments: ChatAttachment[] | null;
  link_preview: ChatLinkPreview | null;
  edited: boolean;
  edited_at: string | null;
  deleted: boolean;
  pinned: boolean;
  created_at: string;
}

export async function fetchMessages(conversationId: string, limit = 200): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, content, reply_to_id, attachments, link_preview, edited, edited_at, deleted, pinned, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];

  const rows = data as MessageRow[];
  const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
  const [directory, reactions] = await Promise.all([
    fetchUsersByAuthIds(senderIds),
    fetchReactionsForMessages(rows.map((r) => r.id)),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));

  return rows.map((r) => {
    const sender = directory.get(r.sender_id);
    const replySource = r.reply_to_id ? byId.get(r.reply_to_id) : null;
    const replySenderName = replySource
      ? directory.get(replySource.sender_id)?.name ?? 'Unknown'
      : '';
    return {
      id: r.id,
      chatId: r.conversation_id,
      senderId: r.sender_id,
      senderName: sender?.name ?? 'Unknown',
      content: r.deleted ? '' : r.content ?? '',
      timestamp: r.created_at,
      edited: r.edited,
      editedAt: r.edited_at ?? undefined,
      deleted: r.deleted,
      pinned: r.pinned,
      attachments: r.deleted ? [] : r.attachments ?? [],
      linkPreview: r.deleted ? null : r.link_preview,
      replyTo: replySource
        ? {
            messageId: replySource.id,
            senderName: replySenderName,
            content: replySource.deleted ? 'Deleted message' : replySource.content ?? '📎 Attachment',
          }
        : undefined,
      reactions: reactions.get(r.id) ?? [],
      readBy: [r.sender_id],
    };
  });
}

async function fetchReactionsForMessages(
  messageIds: string[],
): Promise<Map<string, ChatMessage['reactions']>> {
  const map = new Map<string, NonNullable<ChatMessage['reactions']>>();
  if (messageIds.length === 0) return map;
  const { data } = await supabase
    .from('chat_message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const mid = String(r.message_id);
    const emoji = String(r.emoji);
    const list = map.get(mid) ?? [];
    const existing = list.find((x) => x.emoji === emoji);
    if (existing) {
      existing.userIds.push(String(r.user_id));
      existing.count += 1;
    } else {
      list.push({ emoji, userIds: [String(r.user_id)], count: 1 });
    }
    map.set(mid, list);
  }
  return map;
}

export async function sendMessage(opts: {
  conversationId: string;
  senderId: string;
  content?: string;
  replyToId?: string | null;
  attachments?: ChatAttachment[];
  linkPreview?: ChatLinkPreview | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: opts.conversationId,
      sender_id: opts.senderId,
      content: opts.content?.trim() ? opts.content.trim() : null,
      reply_to_id: opts.replyToId ?? null,
      attachments: opts.attachments ?? [],
      link_preview: opts.linkPreview ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to send' };
  return { ok: true, id: (data as { id: string }).id };
}

/** Fetch a single message with sender info and reactions. Used for incremental realtime updates. */
export async function fetchSingleMessage(messageId: string): Promise<ChatMessage | null> {
  const { data: row, error } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, sender_id, content, reply_to_id, attachments, link_preview, edited, edited_at, deleted, pinned, created_at')
    .eq('id', messageId)
    .maybeSingle();
  if (error || !row) return null;

  const r = row as MessageRow;
  const userIds = [r.sender_id];

  let replyRow: MessageRow | null = null;
  if (r.reply_to_id) {
    const { data: rd } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, sender_id, content, reply_to_id, attachments, link_preview, edited, edited_at, deleted, created_at')
      .eq('id', r.reply_to_id)
      .maybeSingle();
    replyRow = rd as MessageRow | null;
    if (replyRow) userIds.push(replyRow.sender_id);
  }

  const [directory, reactions] = await Promise.all([
    fetchUsersByAuthIds(userIds),
    fetchReactionsForMessages([r.id]),
  ]);

  const sender = directory.get(r.sender_id);
  let replyTo: ChatMessage['replyTo'] | undefined;
  if (replyRow) {
    replyTo = {
      messageId: replyRow.id,
      senderName: directory.get(replyRow.sender_id)?.name ?? 'Unknown',
      content: replyRow.deleted ? 'Deleted message' : replyRow.content ?? '📎 Attachment',
    };
  }

  return {
    id: r.id,
    chatId: r.conversation_id,
    senderId: r.sender_id,
    senderName: sender?.name ?? 'Unknown',
    content: r.deleted ? '' : r.content ?? '',
    timestamp: r.created_at,
    edited: r.edited,
    editedAt: r.edited_at ?? undefined,
    deleted: r.deleted,
    pinned: r.pinned,
    attachments: r.deleted ? [] : r.attachments ?? [],
    linkPreview: r.deleted ? null : r.link_preview,
    replyTo,
    reactions: reactions.get(r.id) ?? [],
    readBy: [r.sender_id],
  };
}

/** Fetch up-to-date reactions for a single message (used for incremental reaction updates). */
export async function fetchMessageReactions(
  messageId: string,
): Promise<NonNullable<ChatMessage['reactions']>> {
  const map = await fetchReactionsForMessages([messageId]);
  return map.get(messageId) ?? [];
}

export async function editMessage(messageId: string, content: string): Promise<void> {
  await supabase
    .from('chat_messages')
    .update({ content: content.trim(), edited: true, edited_at: new Date().toISOString() })
    .eq('id', messageId);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await supabase
    .from('chat_messages')
    .update({ deleted: true, content: null, attachments: [], link_preview: null })
    .eq('id', messageId);
}

export async function togglePinMessage(messageId: string, pinned: boolean): Promise<void> {
  await supabase.from('chat_messages').update({ pinned }).eq('id', messageId);
}

export async function updateGroupAvatar(conversationId: string, avatarUrl: string): Promise<void> {
  await supabase.from('chat_conversations').update({ avatar_url: avatarUrl }).eq('id', conversationId);
}

export async function uploadGroupAvatar(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${CHAT_ATTACHMENT_FOLDER}/group-avatars/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('chat_message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existing) {
    await supabase.from('chat_message_reactions').delete().eq('id', (existing as { id: string }).id);
  } else {
    await supabase
      .from('chat_message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

/** Mark bell notifications for this conversation as read (keeps the badge tidy). */
export async function markChatNotificationsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('event_type', 'chat_message')
    .eq('read', false)
    .contains('metadata', { conversationId });
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
}

// ---------------------------------------------------------------------------
// Create conversations
// ---------------------------------------------------------------------------

/** Find an existing 1:1 conversation between two users, else create one. */
export async function getOrCreateDirectConversation(
  meId: string,
  otherUserId: string,
): Promise<ChatCreateResult> {
  const { data: myParts, error: myPartErr } = await supabase
    .from('chat_participants')
    .select('conversation_id')
    .eq('user_id', meId);
  if (myPartErr) {
    return { ok: false, error: formatChatDbError(myPartErr.code, myPartErr.message) };
  }

  const candidateIds = (myParts ?? []).map((p) => p.conversation_id as string);
  if (candidateIds.length > 0) {
    const { data: directConvs, error: convErr } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('type', 'direct')
      .in('id', candidateIds);
    if (convErr) {
      return { ok: false, error: formatChatDbError(convErr.code, convErr.message) };
    }

    const directIds = (directConvs ?? []).map((c) => c.id as string);
    if (directIds.length > 0) {
      const { data: matches, error: matchErr } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', directIds)
        .limit(1);
      if (matchErr) {
        return { ok: false, error: formatChatDbError(matchErr.code, matchErr.message) };
      }
      if (matches?.length) {
        return { ok: true, conversationId: matches[0].conversation_id as string };
      }
    }
  }

  return createConversation('direct', null, meId, [meId, otherUserId]);
}

export async function createGroupConversation(
  meId: string,
  name: string,
  memberIds: string[],
): Promise<ChatCreateResult> {
  const unique = Array.from(new Set([meId, ...memberIds]));
  return createConversation('group', name, meId, unique);
}

async function createConversation(
  type: 'direct' | 'group',
  name: string | null,
  createdBy: string,
  memberIds: string[],
): Promise<ChatCreateResult> {
  const { data: conv, error } = await supabase
    .from('chat_conversations')
    .insert({ type, name, created_by: createdBy })
    .select('id')
    .single();
  if (error || !conv) {
    const msg = formatChatDbError(error?.code, error?.message ?? 'Could not create conversation.');
    console.warn('[chat] createConversation', error);
    return { ok: false, error: msg };
  }
  const convId = (conv as { id: string }).id;
  const rows = memberIds.map((uid) => ({
    conversation_id: convId,
    user_id: uid,
    role: uid === createdBy ? 'admin' : 'member',
  }));
  const { error: partErr } = await supabase.from('chat_participants').insert(rows);
  if (partErr) {
    console.warn('[chat] add participants', partErr);
    return { ok: false, error: formatChatDbError(partErr.code, partErr.message) };
  }
  return { ok: true, conversationId: convId };
}

export async function addParticipants(
  conversationId: string,
  memberIds: string[],
): Promise<void> {
  if (memberIds.length === 0) return;
  const rows = memberIds.map((uid) => ({
    conversation_id: conversationId,
    user_id: uid,
    role: 'member',
  }));
  await supabase.from('chat_participants').upsert(rows, { onConflict: 'conversation_id,user_id' });
}

export async function removeParticipant(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('chat_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
}

export async function renameGroup(conversationId: string, name: string): Promise<void> {
  await supabase
    .from('chat_conversations')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

// ---------------------------------------------------------------------------
// Attachments + link preview
// ---------------------------------------------------------------------------

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
}

export async function uploadChatAttachment(
  conversationId: string,
  file: File,
): Promise<ChatAttachment> {
  const path = `${CHAT_ATTACHMENT_FOLDER}/${conversationId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}_${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const kind: ChatAttachment['kind'] = file.type.startsWith('image/') ? 'image' : 'file';
  return {
    url: pub.publicUrl,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    kind,
  };
}

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

export type ChatCreateResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

function formatChatDbError(code: string | undefined, message: string): string {
  if (code === 'PGRST205') {
    return 'Chat tables are not visible to the API yet. Run database/chat_system.sql in Supabase, then run NOTIFY pgrst, \'reload schema\'; or wait a minute and refresh.';
  }
  if (code === 'PGRST116' && message.toLowerCase().includes('0 rows')) {
    return 'Could not read the new conversation after creating it. Run database/chat_system_rls_fix.sql in Supabase (RLS policy fix), then try again.';
  }
  return message;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export type MessageEvent = { type: 'INSERT' | 'UPDATE' | 'DELETE'; id: string };
export type ReactionEvent = { messageId: string };

/**
 * Live updates for an open conversation. Delivers granular events (type + id)
 * so the UI can do incremental state merges instead of full refetches.
 */
export function subscribeToConversation(
  conversationId: string,
  handlers: {
    onMessageEvent?: (event: MessageEvent) => void;
    onReactionEvent?: (event: ReactionEvent) => void;
    onParticipantChange?: () => void;
  },
): () => void {
  const channel = supabase
    .channel(`chat:conv:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const id =
          (payload.new as { id?: string } | undefined)?.id ??
          (payload.old as { id?: string } | undefined)?.id;
        if (id) handlers.onMessageEvent?.({ type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', id });
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_message_reactions' },
      (payload) => {
        const messageId =
          (payload.new as { message_id?: string } | undefined)?.message_id ??
          (payload.old as { message_id?: string } | undefined)?.message_id;
        if (messageId) handlers.onReactionEvent?.({ messageId });
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_participants', filter: `conversation_id=eq.${conversationId}` },
      () => handlers.onParticipantChange?.(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Live updates for the sidebar conversation list. Watches messages, participant
 * changes, and conversation renames so the list stays current for all users.
 */
export function subscribeToMyChats(onChange: () => void): () => void {
  const channel = supabase
    .channel('chat:my-list')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_participants' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_conversations' },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function fetchLinkPreview(url: string): Promise<ChatLinkPreview | null> {
  try {
    const res = await notifyFetch('/api/link-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.ok === false) return null;
    return {
      url: data.url ?? url,
      title: data.title ?? undefined,
      description: data.description ?? undefined,
      image: data.image ?? undefined,
      siteName: data.siteName ?? undefined,
    };
  } catch {
    return null;
  }
}
