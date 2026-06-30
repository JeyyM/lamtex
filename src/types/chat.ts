export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  branch: string;
  role: string;
  /** Role within a specific conversation ('admin' | 'member'). Populated in fetchConversations. */
  chatRole?: 'admin' | 'member';
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

export interface ChatAttachment {
  url: string;
  name: string;
  /** MIME type, e.g. image/png, application/pdf */
  type: string;
  size: number;
  kind: 'image' | 'file';
  width?: number;
  height?: number;
}

export interface ChatLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  deleted?: boolean;
  pinned?: boolean;
  attachments?: ChatAttachment[];
  linkPreview?: ChatLinkPreview | null;
  replyTo?: {
    messageId: string;
    senderName: string;
    content: string;
  };
  reactions?: {
    emoji: string;
    userIds: string[];
    count: number;
  }[];
  readBy: string[];
}

export interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group';
  avatar?: string;
  avatarUrl?: string;
  members: ChatUser[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  createdAt: string;
  createdBy: string;
}
