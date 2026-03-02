import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  MessageCircle,
  Search,
  Plus,
  Send,
  Smile,
  Reply,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  X,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Paperclip,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MOCK_CHATS, MOCK_MESSAGES, CURRENT_USER, MOCK_CHAT_USERS } from '../mock/chats';
import { Chat, ChatMessage, ChatUser } from '../types/chat';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥', '✅', '🙏', '💪'];

export default function ChatsPage() {
  const [chats] = useState<Chat[]>(MOCK_CHATS);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(MOCK_CHATS[0]);
  const [messages, setMessages] = useState<{ [chatId: string]: ChatMessage[] }>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      chatId: selectedChat.id,
      senderId: CURRENT_USER.id,
      senderName: CURRENT_USER.name,
      senderAvatar: CURRENT_USER.avatar,
      content: newMessage,
      timestamp: new Date().toISOString(),
      readBy: [CURRENT_USER.id],
      replyTo: replyingTo ? {
        messageId: replyingTo.id,
        senderName: replyingTo.senderName,
        content: replyingTo.content
      } : undefined
    };

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: [...(prev[selectedChat.id] || []), newMsg]
    }));

    setNewMessage('');
    setReplyingTo(null);
  };

  const handleEditMessage = (messageId: string) => {
    if (!selectedChat || !editContent.trim()) return;

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: prev[selectedChat.id].map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              content: editContent,
              edited: true,
              editedAt: new Date().toISOString()
            }
          : msg
      )
    }));

    setEditingMessage(null);
    setEditContent('');
    setShowMessageMenu(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedChat) return;

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: prev[selectedChat.id].filter(msg => msg.id !== messageId)
    }));

    setShowMessageMenu(null);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!selectedChat) return;

    setMessages(prev => ({
      ...prev,
      [selectedChat.id]: prev[selectedChat.id].map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);

          if (existingReaction) {
            // Toggle user's reaction
            const hasReacted = existingReaction.userIds.includes(CURRENT_USER.id);
            if (hasReacted) {
              // Remove reaction
              return {
                ...msg,
                reactions: reactions
                  .map(r =>
                    r.emoji === emoji
                      ? {
                          ...r,
                          userIds: r.userIds.filter(id => id !== CURRENT_USER.id),
                          count: r.count - 1
                        }
                      : r
                  )
                  .filter(r => r.count > 0)
              };
            } else {
              // Add reaction
              return {
                ...msg,
                reactions: reactions.map(r =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        userIds: [...r.userIds, CURRENT_USER.id],
                        count: r.count + 1
                      }
                    : r
                )
              };
            }
          } else {
            // New reaction
            return {
              ...msg,
              reactions: [
                ...reactions,
                { emoji, userIds: [CURRENT_USER.id], count: 1 }
              ]
            };
          }
        }
        return msg;
      })
    }));

    setShowEmojiPicker(null);
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentMessages = selectedChat ? messages[selectedChat.id] || [] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOtherUser = (chat: Chat): ChatUser | null => {
    if (chat.type === 'direct') {
      return chat.members.find(m => m.id !== CURRENT_USER.id) || null;
    }
    return null;
  };

  const handleCreateDirectChat = (user: ChatUser) => {
    // Check if chat already exists
    const existingChat = chats.find(
      chat =>
        chat.type === 'direct' &&
        chat.members.some(m => m.id === user.id)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      // Create new chat (in real app, this would be API call)
      console.log('Create new chat with:', user.name);
    }
    setShowNewChatModal(false);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    // In real app, this would be API call
    console.log('Create group:', groupName, 'with members:', selectedMembers);
    setShowNewGroupModal(false);
    setGroupName('');
    setSelectedMembers([]);
  };

  const toggleMemberSelection = (user: ChatUser) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const branchUsers = MOCK_CHAT_USERS.filter(u => u.branch === CURRENT_USER.branch);
  const otherBranchUsers = MOCK_CHAT_USERS.filter(u => u.branch !== CURRENT_USER.branch);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-red-600" />
          Chats
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Team communication and messaging
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
        {/* Chat List Sidebar */}
        <Card className={`col-span-12 transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'lg:col-span-1 xl:col-span-1' 
            : 'lg:col-span-4 xl:col-span-3'
        }`}>
          <CardContent className="p-0 h-full flex flex-col">
            {/* Collapse Button */}
            <div className="p-4 border-b flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h3 className="font-semibold text-gray-900">Messages</h3>
              )}
              <Button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                variant="outline"
                size="sm"
                className="ml-auto"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </div>

            {!isSidebarCollapsed && (
              <>
                {/* Search and New Chat */}
                <div className="p-4 border-b space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowNewChatModal(true)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                    <Button
                      onClick={() => setShowNewGroupModal(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      New Group
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
              {filteredChats.map((chat) => {
                const otherUser = getOtherUser(chat);
                const displayName = chat.type === 'group' ? chat.name : otherUser?.name || chat.name;
                const isOnline = chat.type === 'direct' && otherUser?.status === 'online';

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedChat?.id === chat.id
                        ? 'bg-red-50 border-l-4 border-l-red-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold">
                          {chat.type === 'group' ? (
                            <Users className="w-6 h-6" />
                          ) : (
                            getUserInitials(displayName)
                          )}
                        </div>
                        {isOnline && (
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getStatusColor(otherUser!.status)} border-2 border-white rounded-full`} />
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {displayName}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {chat.lastMessage && formatTime(chat.lastMessage.timestamp)}
                          </span>
                        </div>
                        {chat.type === 'group' && (
                          <p className="text-xs text-gray-500 mb-1">
                            {chat.members.length} members
                          </p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {chat.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      {chat.unreadCount > 0 && (
                        <div className="flex-shrink-0 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
            )}

            {/* Collapsed View - Show Chat Avatars */}
            {isSidebarCollapsed && (
              <div className="flex-1 overflow-y-auto p-2">
                {filteredChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const displayName = chat.type === 'group' ? chat.name : otherUser?.name || chat.name;
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full mb-2 p-2 rounded-lg transition-colors relative ${
                        selectedChat?.id === chat.id
                          ? 'bg-red-50'
                          : 'hover:bg-gray-50'
                      }`}
                      title={displayName}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold mx-auto">
                        {chat.type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          getUserInitials(displayName)
                        )}
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {chat.unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={`col-span-12 transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'lg:col-span-11 xl:col-span-11' 
            : 'lg:col-span-8 xl:col-span-9'
        }`}>
          {selectedChat ? (
            <CardContent className="p-0 h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold">
                        {selectedChat.type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          getUserInitials(getOtherUser(selectedChat)?.name || selectedChat.name)
                        )}
                      </div>
                      {selectedChat.type === 'direct' && getOtherUser(selectedChat)?.status === 'online' && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(getOtherUser(selectedChat)!.status)} border-2 border-white rounded-full`} />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedChat.type === 'group'
                          ? selectedChat.name
                          : getOtherUser(selectedChat)?.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {selectedChat.type === 'group'
                          ? `${selectedChat.members.length} members`
                          : getOtherUser(selectedChat)?.status === 'online'
                          ? 'Online'
                          : `Last seen ${getOtherUser(selectedChat)?.lastSeen || 'recently'}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMembersModal(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {currentMessages.map((message, index) => {
                  const isOwnMessage = message.senderId === CURRENT_USER.id;
                  const showAvatar = !isOwnMessage && (
                    index === 0 ||
                    currentMessages[index - 1].senderId !== message.senderId
                  );

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                        !showAvatar && !isOwnMessage ? 'ml-12' : ''
                      }`}
                    >
                      {!isOwnMessage && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                          {getUserInitials(message.senderName)}
                        </div>
                      )}

                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && showAvatar && (
                          <p className="text-xs text-gray-600 mb-1 ml-1">{message.senderName}</p>
                        )}

                        {message.replyTo && (
                          <div className="mb-1">
                            <div className={`p-2 rounded-lg text-xs border-l-2 ${
                              isOwnMessage
                                ? 'bg-red-100 border-red-400'
                                : 'bg-gray-200 border-gray-400'
                            }`}>
                              <p className="font-semibold text-gray-700">
                                {message.replyTo.senderName}
                              </p>
                              <p className="text-gray-600 truncate">
                                {message.replyTo.content}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="relative group">
                          {editingMessage === message.id ? (
                            <div className="bg-white border border-gray-300 rounded-lg p-3">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                                className="w-full border-none focus:outline-none text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditMessage(message.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditContent('');
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                className={`rounded-lg p-3 ${
                                  isOwnMessage
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                              >
                                <p className="text-sm break-words">{message.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                    {formatMessageTime(message.timestamp)}
                                  </span>
                                  {message.edited && (
                                    <span className={`text-xs italic ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                      (edited)
                                    </span>
                                  )}
                                  {isOwnMessage && (
                                    <div className="ml-auto">
                                      {message.readBy.length > 1 ? (
                                        <CheckCheck className="w-4 h-4 text-red-100" />
                                      ) : (
                                        <Check className="w-4 h-4 text-red-100" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Reactions */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {message.reactions.map((reaction, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleReaction(message.id, reaction.emoji)}
                                      className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                        reaction.userIds.includes(CURRENT_USER.id)
                                          ? 'bg-red-100 border border-red-300'
                                          : 'bg-gray-100 border border-gray-300'
                                      }`}
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span className="text-gray-600">{reaction.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Message Actions */}
                              {isOwnMessage && (
                                <div className="absolute top-0 right-0 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1">
                                    <button
                                      onClick={() => {
                                        setShowEmojiPicker(message.id);
                                      }}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Smile className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => setReplyingTo(message)}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Reply className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingMessage(message.id);
                                        setEditContent(message.content);
                                      }}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Edit2 className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {!isOwnMessage && (
                                <div className="absolute top-0 left-0 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1">
                                    <button
                                      onClick={() => {
                                        setShowEmojiPicker(message.id);
                                      }}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Smile className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => setReplyingTo(message)}
                                      className="p-1.5 hover:bg-gray-100 rounded"
                                    >
                                      <Reply className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Emoji Picker */}
                              {showEmojiPicker === message.id && (
                                <div className="absolute mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                                  <div className="grid grid-cols-6 gap-1">
                                    {EMOJI_LIST.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReaction(message.id, emoji)}
                                        className="p-1 hover:bg-gray-100 rounded text-lg"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview */}
              {replyingTo && (
                <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Reply className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          Replying to {replyingTo.senderName}
                        </p>
                        <p className="text-xs text-gray-600 truncate max-w-md">
                          {replyingTo.content}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full p-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      rows={1}
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a chat to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">New Chat</h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Your Branch ({CURRENT_USER.branch})
                  </h3>
                  <div className="space-y-2">
                    {branchUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleCreateDirectChat(user)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {getUserInitials(user.name)}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(user.status)} border-2 border-white rounded-full`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Other Branches</h3>
                  <div className="space-y-2">
                    {otherBranchUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleCreateDirectChat(user)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {getUserInitials(user.name)}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(user.status)} border-2 border-white rounded-full`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role} • {user.branch}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">New Group Chat</h2>
                <button
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setGroupName('');
                    setSelectedMembers([]);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="mb-4 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedMembers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm"
                      >
                        <span>{member.name.split(' ')[0]}</span>
                        <button
                          onClick={() => toggleMemberSelection(member)}
                          className="hover:bg-red-200 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Members</p>
                {[...branchUsers, ...otherBranchUsers].map((user) => {
                  const isSelected = selectedMembers.some(m => m.id === user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleMemberSelection(user)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                        isSelected ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                        {getUserInitials(user.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">
                          {user.role} • {user.branch}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => {
                    setShowNewGroupModal(false);
                    setGroupName('');
                    setSelectedMembers([]);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Create Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {selectedChat.type === 'group' ? 'Group Members' : 'Chat Info'}
                </h2>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedChat.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {getUserInitials(member.name)}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} border-2 border-white rounded-full`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {member.name}
                        {member.id === CURRENT_USER.id && (
                          <span className="text-xs text-gray-500 ml-2">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.role} • {member.branch}
                      </p>
                      <p className="text-xs text-gray-400">
                        {member.status === 'online'
                          ? 'Online'
                          : `Last seen ${member.lastSeen || 'recently'}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
