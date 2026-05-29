import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  MessageCircle,
  Search,
  Plus,
  Send,
  Smile,
  Reply,
  Edit2,
  Trash2,
  Users,
  X,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { Chat, ChatMessage, ChatUser, ChatAttachment } from '../types/chat';
import { useAppContext } from '../store/AppContext';
import { supabase } from '../lib/supabase';
import { EmojiPickerPopover } from '../components/chat/EmojiPickerPopover';
import { MessageContent } from '../components/chat/MessageContent';
import {
  fetchChatDirectory,
  fetchConversations,
  fetchMessages,
  sendMessage as sendMessageApi,
  editMessage as editMessageApi,
  deleteMessage as deleteMessageApi,
  toggleReaction as toggleReactionApi,
  markConversationRead,
  markChatNotificationsRead,
  getOrCreateDirectConversation,
  createGroupConversation,
  addParticipants,
  uploadChatAttachment,
  fetchLinkPreview,
  extractFirstUrl,
  subscribeToConversation,
  subscribeToMyChats,
} from '../lib/chat/chatData';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function MemberBranchFilter(props: {
  value: string;
  onChange: (value: string) => void;
  branches: string[];
}) {
  return (
    <div className="mb-3 flex-shrink-0">
      <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
      >
        <option value="all">All branches</option>
        {props.branches.map((branch) => (
          <option key={branch} value={branch}>
            {branch}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ChatsPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { session, employeeName } = useAppContext();
  const currentUserId = session?.user?.id ?? '';

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [directory, setDirectory] = useState<ChatUser[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [memberBranchFilter, setMemberBranchFilter] = useState('all');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === chatId) ?? null,
    [chats, chatId],
  );

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    const list = await fetchConversations(currentUserId);
    setChats(list);
    setLoadingChats(false);
  }, [currentUserId]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const msgs = await fetchMessages(chatId);
    setMessages(msgs);
    setLoadingMessages(false);
  }, [chatId]);

  // Initial load + directory
  useEffect(() => {
    if (!currentUserId) return;
    void loadConversations();
    void fetchChatDirectory(currentUserId).then(setDirectory);
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    supabase
      .from('branches')
      .select('name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (!data?.length) return;
        setBranchOptions(data.map((b) => String(b.name)).filter(Boolean));
      });
  }, []);

  // Realtime: conversation list (RLS-scoped to my conversations)
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = subscribeToMyChats(() => {
      void loadConversations();
    });
    return unsub;
  }, [currentUserId, loadConversations]);

  // Load messages + mark read + realtime when a chat is opened
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    void loadMessages();
    void markConversationRead(chatId, currentUserId).then(() => loadConversations());
    void markChatNotificationsRead(chatId, currentUserId);

    const unsub = subscribeToConversation(chatId, {
      onMessageChange: () => {
        void loadMessages();
        void markConversationRead(chatId, currentUserId);
        // Keep the bell tidy for the conversation you're actively viewing.
        void markChatNotificationsRead(chatId, currentUserId);
      },
      onReactionChange: () => void loadMessages(),
    });
    return unsub;
  }, [chatId, currentUserId, loadMessages, loadConversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, chatId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const formatMessageTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getUserInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getOtherUser = (chat: Chat): ChatUser | null =>
    chat.type === 'direct' ? chat.members.find((m) => m.id !== currentUserId) ?? null : null;

  const chatDisplayName = (chat: Chat): string =>
    chat.type === 'group' ? chat.name || 'Group chat' : getOtherUser(chat)?.name ?? 'Direct message';

  // ── Send / edit / delete / react ──────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!selectedChat || sending) return;
    const text = newMessage.trim();
    if (!text && pendingAttachments.length === 0) return;

    setSending(true);
    let linkPreview = null;
    const hasImage = pendingAttachments.some((a) => a.kind === 'image');
    if (text && !hasImage) {
      const url = extractFirstUrl(text);
      if (url) linkPreview = await fetchLinkPreview(url);
    }

    const res = await sendMessageApi({
      conversationId: selectedChat.id,
      senderId: currentUserId,
      content: text,
      replyToId: replyingTo?.id ?? null,
      attachments: pendingAttachments,
      linkPreview,
    });
    setSending(false);
    if (res.ok) {
      setNewMessage('');
      setReplyingTo(null);
      setPendingAttachments([]);
      setShowComposerEmoji(false);
      void loadMessages();
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    await editMessageApi(messageId, editContent);
    setEditingMessage(null);
    setEditContent('');
    void loadMessages();
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessageApi(messageId);
    void loadMessages();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setShowReactionPicker(null);
    await toggleReactionApi(messageId, currentUserId, emoji);
    void loadMessages();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedChat) return;
    setUploading(true);
    try {
      const uploaded: ChatAttachment[] = [];
      for (const file of Array.from(files)) {
        try {
          uploaded.push(await uploadChatAttachment(selectedChat.id, file));
        } catch (err) {
          console.error('[chat] upload failed', err);
        }
      }
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // ── Create chats ────────────────────────────────────────────────────────
  const handleCreateDirectChat = async (user: ChatUser) => {
    setCreatingChat(true);
    setChatActionError(null);
    const result = await getOrCreateDirectConversation(currentUserId, user.id);
    setCreatingChat(false);
    if (!result.ok) {
      setChatActionError(result.error);
      return;
    }
    setShowNewChatModal(false);
    await loadConversations();
    navigate(`/chats/${result.conversationId}`);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setCreatingChat(true);
    setChatActionError(null);
    const result = await createGroupConversation(
      currentUserId,
      groupName.trim(),
      selectedMembers.map((m) => m.id),
    );
    setCreatingChat(false);
    if (!result.ok) {
      setChatActionError(result.error);
      return;
    }
    setShowNewGroupModal(false);
    setGroupName('');
    setSelectedMembers([]);
    await loadConversations();
    navigate(`/chats/${result.conversationId}`);
  };

  const toggleMemberSelection = (user: ChatUser) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m.id === user.id) ? prev.filter((m) => m.id !== user.id) : [...prev, user],
    );
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedChat || selectedMembers.length === 0) return;
    await addParticipants(selectedChat.id, selectedMembers.map((m) => m.id));
    setSelectedMembers([]);
    setShowMembersModal(false);
    await loadConversations();
    void loadMessages();
  };

  const filteredChats = chats.filter((chat) =>
    chatDisplayName(chat).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const memberBranchOptions = useMemo(() => {
    const names = new Set<string>(branchOptions);
    for (const user of directory) {
      if (user.branch) names.add(user.branch);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [branchOptions, directory]);

  const filteredDirectory = useMemo(() => {
    if (memberBranchFilter === 'all') return directory;
    return directory.filter((user) => user.branch === memberBranchFilter);
  }, [directory, memberBranchFilter]);

  const existingMemberIds = useMemo(
    () => new Set(selectedChat?.members.map((m) => m.id) ?? []),
    [selectedChat?.members],
  );
  const addMemberCandidates = useMemo(
    () => filteredDirectory.filter((u) => !existingMemberIds.has(u.id)),
    [filteredDirectory, existingMemberIds],
  );

  const openNewChatModal = () => {
    setSelectedMembers([]);
    setMemberBranchFilter('all');
    setChatActionError(null);
    setShowNewChatModal(true);
  };

  const openNewGroupModal = () => {
    setSelectedMembers([]);
    setGroupName('');
    setMemberBranchFilter('all');
    setChatActionError(null);
    setShowNewGroupModal(true);
  };

  const openMembersModal = () => {
    setSelectedMembers([]);
    setMemberBranchFilter('all');
    setShowMembersModal(true);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="flex flex-1 min-h-0 w-full gap-0 md:gap-4 md:px-4 overflow-hidden">
        {/* Chat List Sidebar */}
        <Card
          className={`transition-all duration-300 flex-shrink-0 min-w-0 h-full overflow-hidden border-0 rounded-none shadow-none lg:rounded-lg lg:border lg:shadow-sm ${
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-1/3 xl:w-1/4'
          } ${selectedChat && chatId ? 'max-lg:hidden' : 'max-lg:w-full'} max-lg:w-full`}
        >
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h3 className="font-semibold text-gray-900">
                  Messages <span className="text-gray-500 font-normal">(WIP)</span>
                </h3>
              )}
              <Button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                variant="outline"
                size="sm"
                className="ml-auto hidden lg:flex"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>

            <div
              className={`flex-1 min-h-0 flex-col overflow-hidden ${
                isSidebarCollapsed ? 'hidden lg:hidden' : 'flex'
              } max-lg:!flex`}
            >
              <div className="p-4 border-b space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={openNewChatModal}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                  <Button
                    onClick={openNewGroupModal}
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

              <div className="flex-1 min-h-0 overflow-y-auto">
                {loadingChats ? (
                  <div className="p-8 flex justify-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No conversations yet. Start a new chat.
                  </div>
                ) : (
                  filteredChats.map((chat) => {
                    const displayName = chatDisplayName(chat);
                    return (
                      <div
                        key={chat.id}
                        onClick={() => navigate(`/chats/${chat.id}`)}
                        className={`p-4 border-b cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'bg-red-50 border-l-4 border-l-red-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold">
                              {chat.type === 'group' ? <Users className="w-6 h-6" /> : getUserInitials(displayName)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {chat.lastMessage && formatTime(chat.lastMessage.timestamp)}
                              </span>
                            </div>
                            {chat.type === 'group' && (
                              <p className="text-xs text-gray-500 mb-1">{chat.members.length} members</p>
                            )}
                            <p className="text-sm text-gray-600 overflow-hidden line-clamp-1">
                              {chat.lastMessage?.content || 'No messages yet'}
                            </p>
                          </div>
                          {chat.unreadCount > 0 && (
                            <div className="flex-shrink-0 min-w-6 h-6 px-1.5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                              {chat.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {isSidebarCollapsed && (
              <div className="hidden lg:flex lg:flex-1 min-h-0 overflow-y-auto p-2 flex-col">
                {filteredChats.map((chat) => {
                  const displayName = chatDisplayName(chat);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => navigate(`/chats/${chat.id}`)}
                      className={`w-full mb-2 p-2 rounded-lg transition-colors relative ${
                        selectedChat?.id === chat.id ? 'bg-red-50' : 'hover:bg-gray-50'
                      }`}
                      title={displayName}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold mx-auto">
                        {chat.type === 'group' ? <Users className="w-5 h-5" /> : getUserInitials(displayName)}
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
        <Card
          className={`transition-all duration-300 min-w-0 h-full overflow-hidden border-0 rounded-none shadow-none lg:rounded-lg lg:border lg:shadow-sm flex-1 ${
            !selectedChat || !chatId ? 'max-lg:hidden' : 'max-lg:w-full'
          }`}
        >
          {selectedChat ? (
            <CardContent className="p-0 h-full min-h-0 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="shrink-0 p-3 md:p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/chats')}
                      className="max-lg:block lg:hidden -ml-2"
                      title="Back to chats"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold">
                      {selectedChat.type === 'group' ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        getUserInitials(chatDisplayName(selectedChat))
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{chatDisplayName(selectedChat)}</h2>
                      <p className="text-xs text-gray-500">
                        {selectedChat.type === 'group'
                          ? `${selectedChat.members.length} members`
                          : [getOtherUser(selectedChat)?.role, getOtherUser(selectedChat)?.branch]
                              .filter(Boolean)
                              .join(' · ') || 'Direct message'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={openMembersModal}>
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 md:px-4 md:py-3 bg-gray-50 space-y-4">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.senderId === currentUserId;
                    const showAvatar =
                      !isOwnMessage && (index === 0 || messages[index - 1].senderId !== message.senderId);
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                          !showAvatar && !isOwnMessage ? 'ml-10' : ''
                        }`}
                      >
                        {!isOwnMessage && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                            {getUserInitials(message.senderName)}
                          </div>
                        )}
                        <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && showAvatar && (
                            <p className="text-xs text-gray-600 mb-1 ml-1">{message.senderName}</p>
                          )}

                          {message.replyTo && (
                            <div className="mb-1">
                              <div
                                className={`p-2 rounded-lg text-xs border-l-2 ${
                                  isOwnMessage ? 'bg-red-100 border-red-400' : 'bg-gray-200 border-gray-400'
                                }`}
                              >
                                <p className="font-semibold text-gray-700">{message.replyTo.senderName}</p>
                                <p className="text-gray-600 truncate">{message.replyTo.content}</p>
                              </div>
                            </div>
                          )}

                          <div className="relative group">
                            {editingMessage === message.id ? (
                              <div className="bg-white border border-gray-300 rounded-lg p-3 min-w-[240px]">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
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
                                  <MessageContent message={message} isOwnMessage={isOwnMessage} />
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                      {formatMessageTime(message.timestamp)}
                                    </span>
                                    {message.edited && !message.deleted && (
                                      <span className={`text-xs italic ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                        (edited)
                                      </span>
                                    )}
                                    {isOwnMessage && (
                                      <div className="ml-auto">
                                        <CheckCheck className="w-4 h-4 text-red-100" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {message.reactions.map((reaction, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleReaction(message.id, reaction.emoji)}
                                        className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                          reaction.userIds.includes(currentUserId)
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

                                {!message.deleted && (
                                  <div
                                    className={`absolute top-0 ${
                                      isOwnMessage ? 'right-0' : 'left-0'
                                    } -mt-8 opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                                  >
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1">
                                      <button
                                        onClick={() =>
                                          setShowReactionPicker(showReactionPicker === message.id ? null : message.id)
                                        }
                                        className="p-1.5 hover:bg-gray-100 rounded"
                                        title="React"
                                      >
                                        <Smile className="w-4 h-4 text-gray-600" />
                                      </button>
                                      <button
                                        onClick={() => setReplyingTo(message)}
                                        className="p-1.5 hover:bg-gray-100 rounded"
                                        title="Reply"
                                      >
                                        <Reply className="w-4 h-4 text-gray-600" />
                                      </button>
                                      {isOwnMessage && (
                                        <>
                                          <button
                                            onClick={() => {
                                              setEditingMessage(message.id);
                                              setEditContent(message.content);
                                            }}
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                            title="Edit"
                                          >
                                            <Edit2 className="w-4 h-4 text-gray-600" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {showReactionPicker === message.id && (
                                  <div className="absolute z-20 mt-1">
                                    <div className="bg-white border border-gray-200 rounded-full shadow-lg p-1 flex gap-1">
                                      {QUICK_REACTIONS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(message.id, emoji)}
                                          className="p-1 hover:bg-gray-100 rounded-full text-lg"
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply preview */}
              {replyingTo && (
                <div className="shrink-0 px-4 py-2 bg-gray-100 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Reply className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Replying to {replyingTo.senderName}</p>
                        <p className="text-xs text-gray-600 truncate max-w-md">
                          {replyingTo.content || '📎 Attachment'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Pending attachments */}
              {(pendingAttachments.length > 0 || uploading) && (
                <div className="shrink-0 px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-2 flex-wrap items-center">
                  {pendingAttachments.map((att, idx) => (
                    <div key={att.url} className="relative">
                      {att.kind === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border" />
                      ) : (
                        <div className="w-40 h-16 px-2 rounded-lg border bg-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 truncate">{att.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {uploading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </div>
              )}

              {/* Composer */}
              <div className="shrink-0 p-3 md:p-4 border-t bg-white">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <input
                    type="file"
                    ref={imageInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-shrink-0"
                    title="Send image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full p-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      rows={1}
                    />
                    <button
                      onClick={() => setShowComposerEmoji((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                    {showComposerEmoji && (
                      <div className="absolute bottom-12 right-0 z-30">
                        <EmojiPickerPopover
                          onSelect={(emoji) => setNewMessage((prev) => prev + emoji)}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={sending || uploading || (!newMessage.trim() && pendingAttachments.length === 0)}
                    className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewChatModal(false)}>
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">New Chat</h2>
                <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <MemberBranchFilter
                value={memberBranchFilter}
                onChange={setMemberBranchFilter}
                branches={memberBranchOptions}
              />
              {chatActionError && showNewChatModal && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {chatActionError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredDirectory.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {directory.length === 0 ? 'No other users found.' : 'No users in this branch.'}
                  </p>
                )}
                {filteredDirectory.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => void handleCreateDirectChat(user)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(user.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{[user.role, user.branch].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewGroupModal(false)}>
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
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
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected ({selectedMembers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm">
                        <span>{member.name.split(' ')[0]}</span>
                        <button onClick={() => toggleMemberSelection(member)} className="hover:bg-red-200 rounded-full">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <MemberBranchFilter
                value={memberBranchFilter}
                onChange={setMemberBranchFilter}
                branches={memberBranchOptions}
              />

              {chatActionError && showNewGroupModal && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {chatActionError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Members</p>
                {filteredDirectory.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {directory.length === 0 ? 'No other users found.' : 'No users in this branch.'}
                  </p>
                )}
                {filteredDirectory.map((user) => {
                  const isSelected = selectedMembers.some((m) => m.id === user.id);
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
                        <p className="text-xs text-gray-500">{[user.role, user.branch].filter(Boolean).join(' · ')}</p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-red-600" />}
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
                  onClick={() => void handleCreateGroup()}
                  disabled={creatingChat || !groupName.trim() || selectedMembers.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {creatingChat ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Group'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembersModal(false)}>
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">
                  {selectedChat.type === 'group' ? 'Group Members' : 'Chat Info'}
                </h2>
                <button onClick={() => setShowMembersModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
                {selectedChat.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(member.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {member.name}
                        {member.id === currentUserId && <span className="text-xs text-gray-500 ml-2">(You)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{[member.role, member.branch].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedChat.type === 'group' && (
                <div className="mt-4 flex-shrink-0 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Add members</p>
                  <MemberBranchFilter
                    value={memberBranchFilter}
                    onChange={setMemberBranchFilter}
                    branches={memberBranchOptions}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {addMemberCandidates.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-3">
                        {directory.filter((u) => !existingMemberIds.has(u.id)).length === 0
                          ? 'Everyone is already in this group.'
                          : 'No users in this branch.'}
                      </p>
                    )}
                    {addMemberCandidates.map((user) => {
                        const isSelected = selectedMembers.some((m) => m.id === user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleMemberSelection(user)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                              isSelected ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                              {getUserInitials(user.name)}
                            </div>
                            <span className="flex-1 text-sm text-gray-900">{user.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-red-600" />}
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    onClick={() => void handleAddMembersToGroup()}
                    disabled={selectedMembers.length === 0}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Add {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
