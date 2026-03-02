export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  branch: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
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
