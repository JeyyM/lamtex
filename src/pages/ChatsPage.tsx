import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
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
  ChevronDown,
  ArrowLeft,
  Loader2,
  FileText,
  UserMinus,
  LogOut,
  Edit3,
  AlertCircle,
  Info,
  UserPlus,
  Pin,
  Camera,
  Link as LinkIcon,
} from 'lucide-react';
import { Chat, ChatMessage, ChatUser, ChatAttachment } from '../types/chat';
import { useAppContext } from '../store/AppContext';
import { supabase } from '../lib/supabase';
import { EmojiPickerPopover } from '../components/chat/EmojiPickerPopover';
import { MessageContent } from '../components/chat/MessageContent';
import { ChatLightbox, type LightboxImage } from '../components/chat/ChatLightbox';
import { ChatAvatar } from '../components/chat/ChatAvatar';
import { formatChatListPreview } from '../lib/chat/chatDisplay';
import {
  fetchChatDirectory,
  fetchConversations,
  fetchMessages,
  fetchSingleMessage,
  fetchMessageReactions,
  sendMessage as sendMessageApi,
  editMessage as editMessageApi,
  deleteMessage as deleteMessageApi,
  toggleReaction as toggleReactionApi,
  togglePinMessage,
  updateGroupAvatar,
  uploadGroupAvatar,
  markConversationRead,
  markChatNotificationsRead,
  getOrCreateDirectConversation,
  createGroupConversation,
  addParticipants,
  removeParticipant,
  renameGroup,
  uploadChatAttachment,
  fetchLinkPreview,
  extractFirstUrl,
  subscribeToConversation,
  subscribeToMyChats,
  type MessageEvent,
  type ReactionEvent,
} from '../lib/chat/chatData';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function getUserInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── InfoPanel ─────────────────────────────────────────────────────────────
interface InfoPanelProps {
  chat: Chat;
  currentUserId: string;
  isGroupAdmin: boolean;
  renamingGroup: boolean;
  newGroupName: string;
  membersOpen: boolean;
  memberActionError: string | null;
  removingMemberId: string | null;
  pinnedMessages: ChatMessage[];
  pinsOpen: boolean;
  mediaItems: (ChatAttachment & { messageId: string })[];
  fileItems: (ChatAttachment & { messageId: string })[];
  linkItems: NonNullable<ChatMessage['linkPreview']>[];
  mediaOpen: boolean;
  filesOpen: boolean;
  linksOpen: boolean;
  avatarUploading: boolean;
  onClose: () => void;
  onToggleMembers: () => void;
  onTogglePins: () => void;
  onToggleMedia: () => void;
  onToggleFiles: () => void;
  onToggleLinks: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onGroupNameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRemoveMember: (id: string) => void;
  onOpenAddMember: () => void;
  onLeaveGroup: () => void;
  onAvatarClick: () => void;
  onUnpinMessage: (id: string) => void;
  onMediaClick: (url: string, name: string) => void;
  chatDisplayName: string;
}

function InfoSection({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-sm text-gray-800">
          {label}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 text-xs text-gray-400">({count})</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {/* Grid trick: animates to any unknown height smoothly */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  chat,
  currentUserId,
  isGroupAdmin,
  renamingGroup,
  newGroupName,
  membersOpen,
  memberActionError,
  removingMemberId,
  pinnedMessages,
  pinsOpen,
  mediaItems,
  fileItems,
  linkItems,
  mediaOpen,
  filesOpen,
  linksOpen,
  avatarUploading,
  onClose,
  onToggleMembers,
  onTogglePins,
  onToggleMedia,
  onToggleFiles,
  onToggleLinks,
  onStartRename,
  onCancelRename,
  onGroupNameChange,
  onRenameSubmit,
  onRemoveMember,
  onOpenAddMember,
  onLeaveGroup,
  onAvatarClick,
  onUnpinMessage,
  onMediaClick,
  chatDisplayName,
}: InfoPanelProps) {
  return (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-white sticky top-0 z-10">
        <h2 className="font-semibold text-gray-800 text-sm">Chat info</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-4 py-6 border-b border-gray-200">
        <button
          onClick={chat.type === 'group' ? onAvatarClick : undefined}
          className={`relative w-20 h-20 rounded-full mb-3 flex-shrink-0 group ${chat.type === 'group' ? 'cursor-pointer' : 'cursor-default'}`}
          title={chat.type === 'group' ? 'Change group photo' : undefined}
          disabled={avatarUploading}
        >
          <ChatAvatar
            type={chat.type}
            displayName={chatDisplayName}
            avatarUrl={chat.avatarUrl}
            size="lg"
          />
          {chat.type === 'group' && (
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors pointer-events-none">
              {avatarUploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin opacity-0 group-hover:opacity-100" />
                : <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          )}
        </button>

        {renamingGroup ? (
          <div className="flex items-center gap-1.5 w-full max-w-[200px]">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit();
                if (e.key === 'Escape') onCancelRename();
              }}
              placeholder={chatDisplayName}
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <button onClick={onRenameSubmit} disabled={!newGroupName.trim()} className="p-1 bg-red-600 disabled:bg-red-300 text-white rounded hover:bg-red-700">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onCancelRename} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-gray-900 text-center">{chatDisplayName}</p>
            {chat.type === 'group' && isGroupAdmin && (
              <button onClick={onStartRename} className="p-0.5 hover:bg-gray-100 rounded" title="Rename">
                <Edit3 className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {chat.type === 'group' ? `${chat.members.length} members` : 'Direct message'}
        </p>
      </div>

      {memberActionError && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {memberActionError}
        </div>
      )}

      {/* Pinned messages */}
      <InfoSection label="Pinned messages" count={pinnedMessages.length} open={pinsOpen} onToggle={onTogglePins}>
        {pinnedMessages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No pinned messages yet.</p>
        ) : (
          <div className="space-y-1.5">
            {pinnedMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                <Pin className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-600">{msg.senderName}</p>
                  <p className="text-xs text-gray-700 line-clamp-2">{msg.content || '📎 Attachment'}</p>
                </div>
                <button
                  onClick={() => onUnpinMessage(msg.id)}
                  className="p-0.5 text-gray-300 hover:text-red-500 rounded flex-shrink-0"
                  title="Unpin"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </InfoSection>

      {/* Members */}
      <InfoSection label="Chat members" count={chat.members.length} open={membersOpen} onToggle={onToggleMembers}>
        <div className="space-y-1">
          {chat.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {getUserInitials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name}
                    {member.id === currentUserId && <span className="text-xs text-gray-400 ml-1 font-normal">(You)</span>}
                  </p>
                  {member.chatRole === 'admin' && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-semibold flex-shrink-0">Admin</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{[member.role, member.branch].filter(Boolean).join(' · ')}</p>
              </div>
              {chat.type === 'group' && isGroupAdmin && member.id !== currentUserId && (
                <button
                  onClick={() => onRemoveMember(member.id)}
                  disabled={removingMemberId === member.id}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="Remove"
                >
                  {removingMemberId === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
          {chat.type === 'group' && (
            <button
              onClick={onOpenAddMember}
              className="w-full mt-1 flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium">Add people</span>
            </button>
          )}
        </div>
      </InfoSection>

      {/* Media */}
      <InfoSection label="Media" count={mediaItems.length} open={mediaOpen} onToggle={onToggleMedia}>
        {mediaItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No media shared yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {mediaItems.slice(0, 12).map((item, i) => (
              <button
                key={`${item.messageId}-${i}`}
                onClick={() => onMediaClick(item.url, item.name)}
                className="aspect-square rounded overflow-hidden hover:opacity-80 transition-opacity"
              >
                {item.type.startsWith('video/') ? (
                  <video src={item.url} preload="metadata" muted playsInline className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}
      </InfoSection>

      {/* Files */}
      <InfoSection label="Files" count={fileItems.length} open={filesOpen} onToggle={onToggleFiles}>
        {fileItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No files shared yet.</p>
        ) : (
          <div className="space-y-1">
            {fileItems.map((item, i) => (
              <a
                key={`${item.messageId}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                download={item.name}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate flex-1">{item.name}</span>
              </a>
            ))}
          </div>
        )}
      </InfoSection>

      {/* Links */}
      <InfoSection label="Links" count={linkItems.length} open={linksOpen} onToggle={onToggleLinks}>
        {linkItems.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No links shared yet.</p>
        ) : (
          <div className="space-y-1.5">
            {linkItems.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-600 truncate">{link.title || link.url}</p>
                  <p className="text-[10px] text-gray-400 truncate">{link.url}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </InfoSection>

      {/* Leave group */}
      {chat.type === 'group' && (
        <div className="px-4 py-3">
          <button
            onClick={onLeaveGroup}
            disabled={removingMemberId === currentUserId}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            {removingMemberId === currentUserId ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Leave group
          </button>
        </div>
      )}
    </>
  );
}

function MemberBranchFilter({
  value,
  onChange,
  branches,
}: {
  value: string;
  onChange: (value: string) => void;
  branches: string[];
}) {
  return (
    <div className="mb-3 flex-shrink-0">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
      >
        <option value="all">All branches</option>
        {branches.map((branch) => (
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

  // ── Core state ────────────────────────────────────────────────────────────
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [directory, setDirectory] = useState<ChatUser[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Composer state ────────────────────────────────────────────────────────
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── UI toggles ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [infoMembersOpen, setInfoMembersOpen] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(new Set());

  // ── Chat creation ─────────────────────────────────────────────────────────
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [memberBranchFilter, setMemberBranchFilter] = useState('all');
  const [chatActionError, setChatActionError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  // ── Group management ──────────────────────────────────────────────────────
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Info panel sub-features ───────────────────────────────────────────────
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [infoPinsOpen, setInfoPinsOpen] = useState(true);
  const [infoMediaOpen, setInfoMediaOpen] = useState(false);
  const [infoFilesOpen, setInfoFilesOpen] = useState(false);
  const [infoLinksOpen, setInfoLinksOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  /** Maps realId → tempId for messages we sent optimistically. */
  const optimisticIds = useRef<Map<string, string>>(new Map());

  // Keep messagesRef current
  useEffect(() => {
    messagesRef.current = messages;
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedChat = useMemo(
    () => chats.find((c) => c.id === chatId) ?? null,
    [chats, chatId],
  );

  const isGroupAdmin = useMemo(
    () => selectedChat?.members.find((m) => m.id === currentUserId)?.chatRole === 'admin',
    [selectedChat, currentUserId],
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
    setLoadingMessages(true);
    const msgs = await fetchMessages(chatId);
    setMessages(msgs);
    setLoadingMessages(false);
  }, [chatId]);

  // Initial loads
  useEffect(() => {
    if (!currentUserId) return;
    void loadConversations();
    void fetchChatDirectory(currentUserId).then(setDirectory);
  }, [currentUserId, loadConversations]);

  // Branch picker options
  useEffect(() => {
    supabase
      .from('branches')
      .select('name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data?.length) setBranchOptions(data.map((b) => String(b.name)).filter(Boolean));
      });
  }, []);

  // Auto-navigate away when removed from current conversation
  useEffect(() => {
    if (!chatId || loadingChats || chats.length === 0) return;
    if (!chats.find((c) => c.id === chatId)) navigate('/chats');
  }, [chats, chatId, loadingChats, navigate]);

  // ── Realtime handlers ─────────────────────────────────────────────────────
  const handleMessageEvent = useCallback(
    async (event: MessageEvent) => {
      const { type, id } = event;

      if (type === 'INSERT') {
        // Sent by us optimistically — mapping already cleaned up in handleSendMessage
        if (optimisticIds.current.has(id)) {
          optimisticIds.current.delete(id);
          void loadConversations();
          return;
        }
        if (messagesRef.current.some((m) => m.id === id)) {
          void loadConversations();
          return;
        }
        const msg = await fetchSingleMessage(id);
        if (!msg) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === id)) return prev;
          return [...prev, msg];
        });
      } else if (type === 'UPDATE') {
        const msg = await fetchSingleMessage(id);
        if (!msg) return;
        setMessages((prev) => prev.map((m) => (m.id === id ? msg : m)));
      } else {
        // DELETE — reflect soft-delete locally without a round-trip
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, deleted: true, content: '', attachments: [], linkPreview: null }
              : m,
          ),
        );
      }

      void loadConversations();
    },
    [loadConversations],
  );

  const handleReactionEvent = useCallback(async (event: ReactionEvent) => {
    if (!messagesRef.current.some((m) => m.id === event.messageId)) return;
    const reactions = await fetchMessageReactions(event.messageId);
    setMessages((prev) =>
      prev.map((m) => (m.id === event.messageId ? { ...m, reactions } : m)),
    );
  }, []);

  const handleParticipantChange = useCallback(() => {
    void loadConversations();
  }, [loadConversations]);

  // Sidebar realtime
  useEffect(() => {
    if (!currentUserId) return;
    return subscribeToMyChats(() => void loadConversations());
  }, [currentUserId, loadConversations]);

  // Thread realtime
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    void loadMessages();
    void markConversationRead(chatId, currentUserId).then(() => loadConversations());
    void markChatNotificationsRead(chatId, currentUserId);

    return subscribeToConversation(chatId, {
      onMessageEvent: (event) => {
        void handleMessageEvent(event);
        if (event.type === 'INSERT') {
          void markConversationRead(chatId, currentUserId);
          void markChatNotificationsRead(chatId, currentUserId);
        }
      },
      onReactionEvent: (event) => void handleReactionEvent(event),
      onParticipantChange: handleParticipantChange,
    });
  }, [
    chatId,
    currentUserId,
    loadMessages,
    loadConversations,
    handleMessageEvent,
    handleReactionEvent,
    handleParticipantChange,
  ]);

  // Scroll to bottom on new message or chat switch
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, chatId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getOtherUser = (chat: Chat) =>
    chat.type === 'direct' ? chat.members.find((m) => m.id !== currentUserId) ?? null : null;

  const chatDisplayName = (chat: Chat) =>
    chat.type === 'group'
      ? chat.name || 'Group chat'
      : getOtherUser(chat)?.name ?? 'Direct message';

  // ── Send / edit / delete / react ──────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!selectedChat || sending) return;
    const text = newMessage.trim();
    if (!text && pendingAttachments.length === 0) return;

    // Capture snapshot before clearing state
    const currentAttachments = [...pendingAttachments];
    const currentReplyTo = replyingTo;

    // Optimistic insert
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      chatId: selectedChat.id,
      senderId: currentUserId,
      senderName: employeeName || 'You',
      content: text,
      timestamp: new Date().toISOString(),
      edited: false,
      deleted: false,
      attachments: currentAttachments,
      replyTo: currentReplyTo
        ? {
            messageId: currentReplyTo.id,
            senderName: currentReplyTo.senderName,
            content: currentReplyTo.content || '📎 Attachment',
          }
        : undefined,
      reactions: [],
      readBy: [currentUserId],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyingTo(null);
    setPendingAttachments([]);
    setShowComposerEmoji(false);
    setSendError(null);
    setSending(true);

    let linkPreview = null;
    const hasImage = currentAttachments.some((a) => a.kind === 'image');
    if (text && !hasImage) {
      const url = extractFirstUrl(text);
      if (url) linkPreview = await fetchLinkPreview(url);
    }

    const res = await sendMessageApi({
      conversationId: selectedChat.id,
      senderId: currentUserId,
      content: text,
      replyToId: currentReplyTo?.id ?? null,
      attachments: currentAttachments,
      linkPreview,
    });

    setSending(false);

    if (res.ok && res.id) {
      // Replace temp ID with the real DB ID; track it so the realtime INSERT is skipped
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: res.id! } : m)),
      );
      optimisticIds.current.set(res.id, tempId);
    } else if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(res.error ?? 'Failed to send. Please try again.');
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    const trimmed = editContent.trim();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: trimmed, edited: true } : m)),
    );
    setEditingMessage(null);
    setEditContent('');
    await editMessageApi(messageId, trimmed);
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted: true, content: '', attachments: [], linkPreview: null }
          : m,
      ),
    );
    await deleteMessageApi(messageId);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setShowReactionPicker(null);
    // Optimistic toggle
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions ?? [];
        const existing = reactions.find((r) => r.emoji === emoji);
        let updated;
        if (existing) {
          if (existing.userIds.includes(currentUserId)) {
            updated = reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, userIds: r.userIds.filter((id) => id !== currentUserId), count: r.count - 1 }
                  : r,
              )
              .filter((r) => r.count > 0);
          } else {
            updated = reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, userIds: [...r.userIds, currentUserId], count: r.count + 1 }
                : r,
            );
          }
        } else {
          updated = [...reactions, { emoji, userIds: [currentUserId], count: 1 }];
        }
        return { ...m, reactions: updated };
      }),
    );
    await toggleReactionApi(messageId, currentUserId, emoji);
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

  // ── Create chats ──────────────────────────────────────────────────────────
  const handleCreateDirectChat = async (user: ChatUser) => {
    setCreatingChat(true);
    setChatActionError(null);
    const result = await getOrCreateDirectConversation(currentUserId, user.id);
    setCreatingChat(false);
    if (!result.ok) { setChatActionError(result.error); return; }
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
    if (!result.ok) { setChatActionError(result.error); return; }
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
    await loadConversations();
  };

  // ── Group management ──────────────────────────────────────────────────────
  const handleRemoveMember = async (userId: string) => {
    if (!selectedChat) return;
    setRemovingMemberId(userId);
    setMemberActionError(null);
    try {
      await removeParticipant(selectedChat.id, userId);
      await loadConversations();
    } catch {
      setMemberActionError('Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChat) return;
    setRemovingMemberId(currentUserId);
    setMemberActionError(null);
    try {
      await removeParticipant(selectedChat.id, currentUserId);
      setShowInfoPanel(false);
      await loadConversations();
      navigate('/chats');
    } catch {
      setMemberActionError('Failed to leave group. Please try again.');
      setRemovingMemberId(null);
    }
  };

  const handleRenameGroup = async () => {
    if (!selectedChat || !newGroupName.trim()) return;
    setMemberActionError(null);
    await renameGroup(selectedChat.id, newGroupName.trim());
    setRenamingGroup(false);
    setNewGroupName('');
    await loadConversations();
  };

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = useCallback((message: ChatMessage, startIndex: number) => {
    const images = (message.attachments ?? [])
      .filter((a) => a.kind === 'image')
      .map((a) => ({ url: a.url, name: a.name, type: 'image' as const }));
    if (images.length > 0) setLightbox({ images, index: startIndex });
  }, []);

  const openVideoLightbox = useCallback((message: ChatMessage, vidIndex: number) => {
    const videos = (message.attachments ?? [])
      .filter((a) => a.kind === 'file' && a.type.startsWith('video/'))
      .map((a) => ({ url: a.url, name: a.name, type: 'video' as const }));
    if (videos.length > 0) setLightbox({ images: videos, index: vidIndex });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredChats = chats.filter((chat) =>
    chatDisplayName(chat).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const memberBranchOptions = useMemo(() => {
    const names = new Set<string>(branchOptions);
    for (const u of directory) if (u.branch) names.add(u.branch);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [branchOptions, directory]);

  const filteredDirectory = useMemo(
    () => (memberBranchFilter === 'all' ? directory : directory.filter((u) => u.branch === memberBranchFilter)),
    [directory, memberBranchFilter],
  );

  const existingMemberIds = useMemo(
    () => new Set(selectedChat?.members.map((m) => m.id) ?? []),
    [selectedChat?.members],
  );

  const addMemberCandidates = useMemo(
    () => filteredDirectory.filter((u) => !existingMemberIds.has(u.id)),
    [filteredDirectory, existingMemberIds],
  );

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.pinned && !m.deleted),
    [messages],
  );

  const allMediaItems = useMemo(
    () =>
      messages.flatMap((m) =>
        (m.attachments ?? [])
          .filter((a) => a.kind === 'image' || a.type.startsWith('video/'))
          .map((a) => ({ ...a, messageId: m.id })),
      ),
    [messages],
  );

  const allFileItems = useMemo(
    () =>
      messages.flatMap((m) =>
        (m.attachments ?? [])
          .filter((a) => a.kind === 'file' && !a.type.startsWith('video/'))
          .map((a) => ({ ...a, messageId: m.id })),
      ),
    [messages],
  );

  const allLinkItems = useMemo(
    () =>
      messages
        .filter((m) => m.linkPreview?.url)
        .map((m) => m.linkPreview!),
    [messages],
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

  const openInfoPanel = () => {
    setSelectedMembers([]);
    setMemberBranchFilter('all');
    setMemberActionError(null);
    setRenamingGroup(false);
    setNewGroupName('');
    setShowInfoPanel(true);
  };

  const hideFromSelf = (messageId: string) => {
    setHiddenMessages((prev) => new Set([...prev, messageId]));
  };

  const handlePinMessage = async (messageId: string, pinned: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned } : m));
    await togglePinMessage(messageId, pinned);
  };

  const handleGroupAvatarUpload = async (file: File) => {
    if (!selectedChat) return;
    setAvatarUploading(true);
    try {
      const url = await uploadGroupAvatar(file);
      await updateGroupAvatar(selectedChat.id, url);
      await loadConversations();
    } catch (e) {
      console.error('[chat] avatar upload failed', e);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden bg-gray-50">
      <div className="flex flex-1 min-h-0 min-w-0 w-full gap-0 md:gap-4 md:px-4 overflow-hidden">

        {/* ── Sidebar ── */}
        <Card
          className={`transition-all duration-300 flex-shrink-0 min-w-0 min-h-0 self-stretch overflow-hidden border-0 rounded-none shadow-none lg:rounded-lg lg:border lg:border-gray-200 lg:shadow-sm ${
            isSidebarCollapsed ? 'lg:w-20' : 'lg:w-1/3 xl:w-1/4'
          } ${selectedChat && chatId ? 'max-lg:hidden' : 'max-lg:w-full'} max-lg:w-full`}
        >
          <CardContent className="p-0 h-full min-h-0 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h3 className="font-semibold text-gray-900">Messages</h3>
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
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div className="flex gap-2">
                  <Button onClick={openNewChatModal} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                  <Button onClick={openNewGroupModal} variant="outline" className="flex-1">
                    <Users className="w-4 h-4 mr-2" />
                    New Group
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                        className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'bg-red-50 border-l-4 border-l-red-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <ChatAvatar
                            type={chat.type}
                            displayName={displayName}
                            avatarUrl={chat.avatarUrl}
                            size="sm"
                          />
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
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {formatChatListPreview(chat, currentUserId)}
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

            {/* Collapsed icon strip */}
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
                      <ChatAvatar
                        type={chat.type}
                        displayName={displayName}
                        avatarUrl={chat.avatarUrl}
                        size="xs"
                        className="mx-auto"
                      />
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

        {/* ── Chat Thread ── */}
        <Card
          className={`transition-all duration-300 min-w-0 min-h-0 self-stretch overflow-hidden border-0 rounded-none shadow-none lg:rounded-lg lg:border lg:border-gray-200 lg:shadow-sm flex-1 ${
            !selectedChat || !chatId ? 'max-lg:hidden' : 'max-lg:w-full'
          }`}
        >
          {selectedChat ? (
            <CardContent className="p-0 h-full min-h-0 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="shrink-0 p-3 md:p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/chats')}
                      className="max-lg:flex lg:hidden -ml-2"
                      title="Back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <ChatAvatar
                      type={selectedChat.type}
                      displayName={chatDisplayName(selectedChat)}
                      avatarUrl={selectedChat.avatarUrl}
                      size="xs"
                    />
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
                  <button
                    onClick={() => showInfoPanel ? setShowInfoPanel(false) : openInfoPanel()}
                    className={`p-2 rounded-lg transition-colors ${showInfoPanel ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'}`}
                    title="Chat info"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── Body row: messages column + optional info panel ── */}
              <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
              {/* Messages + composer column */}
              <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
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
                  messages.filter((m) => !hiddenMessages.has(m.id)).map((message, index) => {
                    const isOwnMessage = message.senderId === currentUserId;
                    const isOptimistic = message.id.startsWith('optimistic-');
                    const showAvatar =
                      !isOwnMessage &&
                      (index === 0 || messages[index - 1].senderId !== message.senderId);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                          !showAvatar && !isOwnMessage ? 'ml-10' : ''
                        }`}
                      >
                        {!isOwnMessage && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0 mt-1">
                            {getUserInitials(message.senderName)}
                          </div>
                        )}
                        <div className={`max-w-[75%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && showAvatar && (
                            <p className="text-xs text-gray-600 mb-1 ml-1">{message.senderName}</p>
                          )}

                          {message.replyTo && (
                            <div className="mb-1 w-full">
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

                          <div className="relative group w-full">
                            {editingMessage === message.id ? (
                              <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-[240px]">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleEditMessage(message.id);
                                    if (e.key === 'Escape') { setEditingMessage(null); setEditContent(''); }
                                  }}
                                  className="w-full border-none focus:outline-none text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" onClick={() => void handleEditMessage(message.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingMessage(null); setEditContent(''); }}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div
                                  className={`rounded-lg p-3 transition-opacity ${
                                    isOwnMessage
                                      ? `bg-red-600 text-white ${isOptimistic ? 'opacity-60' : ''}`
                                      : 'bg-white border border-gray-200 text-gray-900'
                                  }`}
                                >
                                  <MessageContent
                                    message={message}
                                    isOwnMessage={isOwnMessage}
                                    onImageClick={(imgIdx) => openLightbox(message, imgIdx)}
                                    onVideoClick={(vidIdx) => openVideoLightbox(message, vidIdx)}
                                  />
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`text-xs ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                      {formatMessageTime(message.timestamp)}
                                    </span>
                                    {message.pinned && !message.deleted && (
                                      <span className="text-xs text-amber-500 flex items-center gap-0.5">
                                        <Pin className="w-2.5 h-2.5" fill="currentColor" />
                                        Pinned
                                      </span>
                                    )}
                                    {message.edited && !message.deleted && (
                                      <span className={`text-xs italic ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                                        (edited)
                                      </span>
                                    )}
                                    {message.deleted && (
                                      <button
                                        onClick={() => hideFromSelf(message.id)}
                                        className={`text-xs underline transition-opacity opacity-60 hover:opacity-100 ${
                                          isOwnMessage ? 'text-red-100' : 'text-gray-400'
                                        }`}
                                        title="Hide this message from your view"
                                      >
                                        Hide
                                      </button>
                                    )}
                                    {isOwnMessage && (
                                      <div className="ml-auto">
                                        {isOptimistic
                                          ? <Loader2 className="w-3 h-3 text-red-200 animate-spin" />
                                          : <CheckCheck className="w-4 h-4 text-red-200" />
                                        }
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {message.reactions.map((reaction, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => void handleReaction(message.id, reaction.emoji)}
                                        className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${
                                          reaction.userIds.includes(currentUserId)
                                            ? 'bg-red-100 border border-red-300 hover:bg-red-200'
                                            : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                                        }`}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span className="text-gray-600">{reaction.count}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {!message.deleted && !isOptimistic && (
                                  <div
                                    className={`absolute top-0 ${
                                      isOwnMessage ? 'right-0' : 'left-0'
                                    } -mt-8 opacity-0 group-hover:opacity-100 transition-opacity z-10`}
                                  >
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1">
                                      <button
                                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
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
                                      <button
                                        onClick={() => void handlePinMessage(message.id, !message.pinned)}
                                        className={`p-1.5 hover:bg-gray-100 rounded ${message.pinned ? 'text-amber-500' : ''}`}
                                        title={message.pinned ? 'Unpin' : 'Pin'}
                                      >
                                        <Pin className="w-4 h-4" fill={message.pinned ? 'currentColor' : 'none'} />
                                      </button>
                                      {isOwnMessage && (
                                        <>
                                          <button
                                            onClick={() => { setEditingMessage(message.id); setEditContent(message.content); }}
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                            title="Edit"
                                          >
                                            <Edit2 className="w-4 h-4 text-gray-600" />
                                          </button>
                                          <button
                                            onClick={() => setDeleteConfirmId(message.id)}
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
                                  <div className={`absolute z-20 mt-1 ${isOwnMessage ? 'right-0' : 'left-0'}`}>
                                    <div className="bg-white border border-gray-200 rounded-full shadow-lg p-1 flex gap-1">
                                      {QUICK_REACTIONS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => void handleReaction(message.id, emoji)}
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
                        <p className="text-xs font-semibold text-gray-700">
                          Replying to {replyingTo.senderName}
                        </p>
                        <p className="text-xs text-gray-600 truncate max-w-sm">
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

              {/* Pending attachments preview */}
              {(pendingAttachments.length > 0 || uploading) && (
                <div className="shrink-0 px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-2 flex-wrap items-center">
                  {pendingAttachments.map((att, idx) => (
                    <div key={att.url} className="relative">
                      {att.kind === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <div className="w-40 h-16 px-2 rounded-lg border border-gray-200 bg-white flex items-center gap-2">
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

              {/* Send error */}
              {sendError && (
                <div className="shrink-0 px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button onClick={() => setSendError(null)} className="p-0.5 hover:bg-red-100 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Composer */}
              <div className="shrink-0 p-3 md:p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <input
                    type="file"
                    ref={imageInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <input
                    type="file"
                    ref={groupAvatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleGroupAvatarUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-shrink-0 h-10 w-10 p-0"
                    title="Send image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 h-10 w-10 p-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        if (sendError) setSendError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="Type a message… (Shift+Enter for new line)"
                      className="w-full py-2 pl-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none min-h-[40px] leading-6"
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
                    className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0 h-10 w-10 p-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              </div>{/* end messages+composer column */}

              {/* ── Info panel (desktop sidebar) ── */}
              {showInfoPanel && (
                <div className="hidden lg:flex w-72 min-h-0 flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
                  <InfoPanel
                    chat={selectedChat}
                    currentUserId={currentUserId}
                    isGroupAdmin={isGroupAdmin}
                    renamingGroup={renamingGroup}
                    newGroupName={newGroupName}
                    membersOpen={infoMembersOpen}
                    memberActionError={memberActionError}
                    removingMemberId={removingMemberId}
                    pinnedMessages={pinnedMessages}
                    pinsOpen={infoPinsOpen}
                    mediaItems={allMediaItems}
                    fileItems={allFileItems}
                    linkItems={allLinkItems}
                    mediaOpen={infoMediaOpen}
                    filesOpen={infoFilesOpen}
                    linksOpen={infoLinksOpen}
                    avatarUploading={avatarUploading}
                    onClose={() => setShowInfoPanel(false)}
                    onToggleMembers={() => setInfoMembersOpen((v) => !v)}
                    onTogglePins={() => setInfoPinsOpen((v) => !v)}
                    onToggleMedia={() => setInfoMediaOpen((v) => !v)}
                    onToggleFiles={() => setInfoFilesOpen((v) => !v)}
                    onToggleLinks={() => setInfoLinksOpen((v) => !v)}
                    onStartRename={() => { setRenamingGroup(true); setNewGroupName(chatDisplayName(selectedChat)); }}
                    onCancelRename={() => { setRenamingGroup(false); setNewGroupName(''); }}
                    onGroupNameChange={setNewGroupName}
                    onRenameSubmit={() => void handleRenameGroup()}
                    onRemoveMember={(id) => void handleRemoveMember(id)}
                    onOpenAddMember={() => { setSelectedMembers([]); setMemberBranchFilter('all'); setShowAddMemberModal(true); }}
                    onLeaveGroup={() => void handleLeaveGroup()}
                    onAvatarClick={() => groupAvatarInputRef.current?.click()}
                    onUnpinMessage={(id) => void handlePinMessage(id, false)}
                    onMediaClick={(url, name) => setLightbox({ images: [{ url, name, type: 'image' }], index: 0 })}
                    chatDisplayName={chatDisplayName(selectedChat)}
                  />
                </div>
              )}
              </div>{/* end body row */}
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

      {/* ── New Direct Chat Modal ── */}
      <PortalModalOverlay open={showNewChatModal} onClose={() => setShowNewChatModal(false)} zIndex={50}>
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">New Chat</h2>
                <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <MemberBranchFilter value={memberBranchFilter} onChange={setMemberBranchFilter} branches={memberBranchOptions} />
              {chatActionError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {chatActionError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {filteredDirectory.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {directory.length === 0 ? 'No other users found.' : 'No users in this branch.'}
                  </p>
                )}
                {filteredDirectory.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => !creatingChat && void handleCreateDirectChat(user)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500">{[user.role, user.branch].filter(Boolean).join(' · ')}</p>
                    </div>
                    {creatingChat && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </PortalModalOverlay>

      {/* ── New Group Modal ── */}
      <PortalModalOverlay open={showNewGroupModal} onClose={() => { setShowNewGroupModal(false); setGroupName(''); setSelectedMembers([]); }} zIndex={50}>
          <Card className="w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold">New Group Chat</h2>
                <button
                  onClick={() => { setShowNewGroupModal(false); setGroupName(''); setSelectedMembers([]); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name…"
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="mb-3 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedMembers.length})
                  </p>
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

              <MemberBranchFilter value={memberBranchFilter} onChange={setMemberBranchFilter} branches={memberBranchOptions} />

              {chatActionError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {chatActionError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Members</p>
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
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500">{[user.role, user.branch].filter(Boolean).join(' · ')}</p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => { setShowNewGroupModal(false); setGroupName(''); setSelectedMembers([]); }}
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
        </PortalModalOverlay>

      {/* ── Info panel (mobile overlay) ── */}
      {showInfoPanel && selectedChat && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setShowInfoPanel(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <InfoPanel
              chat={selectedChat}
              currentUserId={currentUserId}
              isGroupAdmin={isGroupAdmin}
              renamingGroup={renamingGroup}
              newGroupName={newGroupName}
              membersOpen={infoMembersOpen}
              memberActionError={memberActionError}
              removingMemberId={removingMemberId}
              pinnedMessages={pinnedMessages}
              pinsOpen={infoPinsOpen}
              mediaItems={allMediaItems}
              fileItems={allFileItems}
              linkItems={allLinkItems}
              mediaOpen={infoMediaOpen}
              filesOpen={infoFilesOpen}
              linksOpen={infoLinksOpen}
              avatarUploading={avatarUploading}
              onClose={() => setShowInfoPanel(false)}
              onToggleMembers={() => setInfoMembersOpen((v) => !v)}
              onTogglePins={() => setInfoPinsOpen((v) => !v)}
              onToggleMedia={() => setInfoMediaOpen((v) => !v)}
              onToggleFiles={() => setInfoFilesOpen((v) => !v)}
              onToggleLinks={() => setInfoLinksOpen((v) => !v)}
              onStartRename={() => { setRenamingGroup(true); setNewGroupName(chatDisplayName(selectedChat)); }}
              onCancelRename={() => { setRenamingGroup(false); setNewGroupName(''); }}
              onGroupNameChange={setNewGroupName}
              onRenameSubmit={() => void handleRenameGroup()}
              onRemoveMember={(id) => void handleRemoveMember(id)}
              onOpenAddMember={() => { setSelectedMembers([]); setMemberBranchFilter('all'); setShowAddMemberModal(true); }}
              onLeaveGroup={() => void handleLeaveGroup()}
              onAvatarClick={() => groupAvatarInputRef.current?.click()}
              onUnpinMessage={(id) => void handlePinMessage(id, false)}
              onMediaClick={(url, name) => setLightbox({ images: [{ url, name, type: 'image' }], index: 0 })}
              chatDisplayName={chatDisplayName(selectedChat)}
            />
          </div>
        </div>
      )}

      {/* ── Delete message modal ── */}
      <PortalModalOverlay open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} zIndex={60}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Remove message?</h3>
              <p className="text-sm text-gray-500 mb-4">You can remove this message for everyone or just hide it from your view.</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <button
                onClick={() => { hideFromSelf(deleteConfirmId); setDeleteConfirmId(null); }}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-800 text-left flex items-center gap-3 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">👤</span>
                <div>
                  <p className="font-semibold">Hide from self</p>
                  <p className="text-xs text-gray-500 mt-0.5">Remove only from your view</p>
                </div>
              </button>
              <button
                onClick={() => { void handleDeleteMessage(deleteConfirmId); setDeleteConfirmId(null); }}
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 text-left flex items-center gap-3 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </span>
                <div>
                  <p className="font-semibold">Delete for everyone</p>
                  <p className="text-xs text-red-400 mt-0.5">Permanently remove for all participants</p>
                </div>
              </button>
            </div>
            <div className="px-4 pb-5 text-center">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </PortalModalOverlay>

      {/* ── Add Member Modal ── */}
      <PortalModalOverlay open={showAddMemberModal && Boolean(selectedChat)} onClose={() => setShowAddMemberModal(false)} zIndex={50}>
          <Card className="w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden">
            <CardContent className="p-5 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-base font-bold">Add people</h2>
                <button onClick={() => setShowAddMemberModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <MemberBranchFilter value={memberBranchFilter} onChange={setMemberBranchFilter} branches={memberBranchOptions} />
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {addMemberCandidates.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Everyone is already in this group.</p>
                ) : (
                  addMemberCandidates.map((user) => {
                    const isSel = selectedMembers.some((m) => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMemberSelection(user)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer ${isSel ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {getUserInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{[user.role, user.branch].filter(Boolean).join(' · ')}</p>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-red-600 flex-shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
              {selectedMembers.length > 0 && (
                <Button
                  onClick={() => { void handleAddMembersToGroup(); setShowAddMemberModal(false); }}
                  className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                >
                  Add {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                </Button>
              )}
            </CardContent>
          </Card>
        </PortalModalOverlay>

      {/* ── Image Lightbox ── */}
      {lightbox && (
        <ChatLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
