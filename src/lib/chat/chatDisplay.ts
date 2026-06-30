import type { Chat } from '@/src/types/chat';

/** First token of a display name, e.g. "Joe Garcia" → "Joe". */
export function chatFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'Someone';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Sidebar preview: "Joe: Sup" in group chats; plain text in direct chats. */
export function formatChatListPreview(chat: Chat, currentUserId?: string): string {
  const content = chat.lastMessage?.content?.trim();
  if (!content) return 'No messages yet';

  if (chat.type !== 'group') return content;

  const senderId = chat.lastMessage?.senderId;
  if (!senderId) return content;

  if (senderId === currentUserId) return `You: ${content}`;

  const member = chat.members.find((m) => m.id === senderId);
  const first = member ? chatFirstName(member.name) : 'Someone';
  return `${first}: ${content}`;
}
