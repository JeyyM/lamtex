import { Chat, ChatUser, ChatMessage } from '../types/chat';

// Mock current user
export const CURRENT_USER: ChatUser = {
  id: 'user-001',
  name: 'Juan dela Cruz',
  branch: 'Branch A',
  role: 'Executive',
  status: 'online',
  avatar: undefined
};

// Mock users from different branches
export const MOCK_CHAT_USERS: ChatUser[] = [
  {
    id: 'user-002',
    name: 'Maria Santos',
    branch: 'Branch A',
    role: 'Sales Agent',
    status: 'online',
    avatar: undefined
  },
  {
    id: 'user-003',
    name: 'Carlos Reyes',
    branch: 'Branch A',
    role: 'Warehouse Manager',
    status: 'online',
    avatar: undefined
  },
  {
    id: 'user-004',
    name: 'Ana Garcia',
    branch: 'Branch B',
    role: 'Logistics Coordinator',
    status: 'away',
    lastSeen: '5 minutes ago'
  },
  {
    id: 'user-005',
    name: 'Roberto Cruz',
    branch: 'Branch B',
    role: 'Sales Agent',
    status: 'offline',
    lastSeen: '2 hours ago'
  },
  {
    id: 'user-006',
    name: 'Lisa Tan',
    branch: 'Branch C',
    role: 'Finance Officer',
    status: 'online',
    avatar: undefined
  },
  {
    id: 'user-007',
    name: 'Pedro Martinez',
    branch: 'Branch A',
    role: 'Production Manager',
    status: 'offline',
    lastSeen: '1 day ago'
  },
  {
    id: 'user-008',
    name: 'Sofia Ramos',
    branch: 'Branch B',
    role: 'Customer Service',
    status: 'online',
    avatar: undefined
  }
];

// Mock chats
export const MOCK_CHATS: Chat[] = [
  {
    id: 'chat-001',
    name: 'Maria Santos',
    type: 'direct',
    members: [CURRENT_USER, MOCK_CHAT_USERS[0]],
    lastMessage: {
      content: 'Perfect! I\'ll send the invoice by end of day.',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      senderId: 'user-002'
    },
    unreadCount: 2,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
    createdBy: 'user-001'
  },
  {
    id: 'chat-002',
    name: 'Warehouse Team',
    type: 'group',
    members: [CURRENT_USER, MOCK_CHAT_USERS[1], MOCK_CHAT_USERS[5]],
    lastMessage: {
      content: 'Inventory count completed for Building Materials section.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      senderId: 'user-003'
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    createdBy: 'user-001'
  },
  {
    id: 'chat-003',
    name: 'Multi-Branch Logistics',
    type: 'group',
    members: [CURRENT_USER, MOCK_CHAT_USERS[2], MOCK_CHAT_USERS[3], MOCK_CHAT_USERS[6]],
    lastMessage: {
      content: 'The delivery to Manila is scheduled for tomorrow morning.',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      senderId: 'user-004'
    },
    unreadCount: 5,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60000).toISOString(),
    createdBy: 'user-001'
  },
  {
    id: 'chat-004',
    name: 'Lisa Tan',
    type: 'direct',
    members: [CURRENT_USER, MOCK_CHAT_USERS[4]],
    lastMessage: {
      content: 'Thanks for approving the payment request!',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      senderId: 'user-006'
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60000).toISOString(),
    createdBy: 'user-006'
  },
  {
    id: 'chat-005',
    name: 'Sales Team',
    type: 'group',
    members: [CURRENT_USER, MOCK_CHAT_USERS[0], MOCK_CHAT_USERS[3], MOCK_CHAT_USERS[6]],
    lastMessage: {
      content: 'Great job everyone! We hit 110% of our target this month! 🎉',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      senderId: 'user-001'
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60000).toISOString(),
    createdBy: 'user-001'
  }
];

// Mock messages for each chat
export const MOCK_MESSAGES: { [chatId: string]: ChatMessage[] } = {
  'chat-001': [
    {
      id: 'msg-001-001',
      chatId: 'chat-001',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Hi Maria, can you follow up on the BuildMart order?',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-002']
    },
    {
      id: 'msg-001-002',
      chatId: 'chat-001',
      senderId: 'user-002',
      senderName: 'Maria Santos',
      content: 'Yes sir! I already contacted them this morning.',
      timestamp: new Date(Date.now() - 58 * 60000).toISOString(),
      replyTo: {
        messageId: 'msg-001-001',
        senderName: 'Juan dela Cruz',
        content: 'Hi Maria, can you follow up on the BuildMart order?'
      },
      readBy: ['user-001', 'user-002']
    },
    {
      id: 'msg-001-003',
      chatId: 'chat-001',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Excellent! What did they say?',
      timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
      reactions: [
        { emoji: '👍', userIds: ['user-002'], count: 1 }
      ],
      readBy: ['user-001', 'user-002']
    },
    {
      id: 'msg-001-004',
      chatId: 'chat-001',
      senderId: 'user-002',
      senderName: 'Maria Santos',
      content: 'They confirmed the delivery for Friday. They also want to add 50 more units of HDPE pipes.',
      timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
      readBy: ['user-001', 'user-002']
    },
    {
      id: 'msg-001-005',
      chatId: 'chat-001',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Great work! Approve the additional units and send them the updated invoice.',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      reactions: [
        { emoji: '✅', userIds: ['user-002'], count: 1 },
        { emoji: '👏', userIds: ['user-002'], count: 1 }
      ],
      readBy: ['user-001', 'user-002']
    },
    {
      id: 'msg-001-006',
      chatId: 'chat-001',
      senderId: 'user-002',
      senderName: 'Maria Santos',
      content: 'Perfect! I\'ll send the invoice by end of day.',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      readBy: ['user-002']
    }
  ],
  'chat-002': [
    {
      id: 'msg-002-001',
      chatId: 'chat-002',
      senderId: 'user-003',
      senderName: 'Carlos Reyes',
      content: 'Good morning team! Starting the monthly inventory count today.',
      timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-003', 'user-007']
    },
    {
      id: 'msg-002-002',
      chatId: 'chat-002',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Thanks Carlos! Please prioritize the high-value items first.',
      timestamp: new Date(Date.now() - 3.5 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '👍', userIds: ['user-003', 'user-007'], count: 2 }
      ],
      readBy: ['user-001', 'user-003', 'user-007']
    },
    {
      id: 'msg-002-003',
      chatId: 'chat-002',
      senderId: 'user-007',
      senderName: 'Pedro Martinez',
      content: 'I can help with the raw materials section if needed.',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-003', 'user-007']
    },
    {
      id: 'msg-002-004',
      chatId: 'chat-002',
      senderId: 'user-003',
      senderName: 'Carlos Reyes',
      content: 'That would be great Pedro! Let\'s divide the work - you take raw materials, I\'ll handle finished goods.',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60000).toISOString(),
      replyTo: {
        messageId: 'msg-002-003',
        senderName: 'Pedro Martinez',
        content: 'I can help with the raw materials section if needed.'
      },
      reactions: [
        { emoji: '💪', userIds: ['user-001', 'user-007'], count: 2 }
      ],
      readBy: ['user-001', 'user-003', 'user-007']
    },
    {
      id: 'msg-002-005',
      chatId: 'chat-002',
      senderId: 'user-003',
      senderName: 'Carlos Reyes',
      content: 'Inventory count completed for Building Materials section.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      edited: true,
      editedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      reactions: [
        { emoji: '✅', userIds: ['user-001'], count: 1 },
        { emoji: '🎉', userIds: ['user-007'], count: 1 }
      ],
      readBy: ['user-001', 'user-003', 'user-007']
    }
  ],
  'chat-003': [
    {
      id: 'msg-003-001',
      chatId: 'chat-003',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Hi team! Let\'s coordinate the cross-branch deliveries for this week.',
      timestamp: new Date(Date.now() - 6 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-002',
      chatId: 'chat-003',
      senderId: 'user-004',
      senderName: 'Ana Garcia',
      content: 'I have 3 deliveries scheduled from Branch B to Metro Manila.',
      timestamp: new Date(Date.now() - 5.5 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-003',
      chatId: 'chat-003',
      senderId: 'user-008',
      senderName: 'Sofia Ramos',
      content: 'I can help with the customer coordination on our end.',
      timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '🙏', userIds: ['user-004'], count: 1 }
      ],
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-004',
      chatId: 'chat-003',
      senderId: 'user-005',
      senderName: 'Roberto Cruz',
      content: 'Do we have the truck capacity for all deliveries?',
      timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-005',
      chatId: 'chat-003',
      senderId: 'user-004',
      senderName: 'Ana Garcia',
      content: 'Yes, I\'ve already allocated 2 trucks for tomorrow and 1 for Wednesday.',
      timestamp: new Date(Date.now() - 3.5 * 60 * 60000).toISOString(),
      replyTo: {
        messageId: 'msg-003-004',
        senderName: 'Roberto Cruz',
        content: 'Do we have the truck capacity for all deliveries?'
      },
      reactions: [
        { emoji: '✅', userIds: ['user-001', 'user-005'], count: 2 }
      ],
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-006',
      chatId: 'chat-003',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Perfect! Keep me updated on any delays or issues.',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-004', 'user-005', 'user-008']
    },
    {
      id: 'msg-003-007',
      chatId: 'chat-003',
      senderId: 'user-004',
      senderName: 'Ana Garcia',
      content: 'The delivery to Manila is scheduled for tomorrow morning.',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      readBy: ['user-004']
    }
  ],
  'chat-004': [
    {
      id: 'msg-004-001',
      chatId: 'chat-004',
      senderId: 'user-006',
      senderName: 'Lisa Tan',
      content: 'Good afternoon sir! I need your approval for the supplier payment of ₱2.5M.',
      timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-006']
    },
    {
      id: 'msg-004-002',
      chatId: 'chat-004',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Hi Lisa, can you send me the invoice details?',
      timestamp: new Date(Date.now() - 4.5 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-006']
    },
    {
      id: 'msg-004-003',
      chatId: 'chat-004',
      senderId: 'user-006',
      senderName: 'Lisa Tan',
      content: 'Sure! It\'s for the PVC resin shipment - Invoice #INV-2026-0342. Due date is March 5.',
      timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-006']
    },
    {
      id: 'msg-004-004',
      chatId: 'chat-004',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Approved! Please process the payment.',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '✅', userIds: ['user-006'], count: 1 },
        { emoji: '🙏', userIds: ['user-006'], count: 1 }
      ],
      readBy: ['user-001', 'user-006']
    },
    {
      id: 'msg-004-005',
      chatId: 'chat-004',
      senderId: 'user-006',
      senderName: 'Lisa Tan',
      content: 'Thanks for approving the payment request!',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-006']
    }
  ],
  'chat-005': [
    {
      id: 'msg-005-001',
      chatId: 'chat-005',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Good morning Sales Team! Let\'s review our February performance.',
      timestamp: new Date(Date.now() - 8 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    },
    {
      id: 'msg-005-002',
      chatId: 'chat-005',
      senderId: 'user-002',
      senderName: 'Maria Santos',
      content: 'We closed 85 orders this month from Branch A!',
      timestamp: new Date(Date.now() - 7 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '🎉', userIds: ['user-001', 'user-005'], count: 2 },
        { emoji: '👏', userIds: ['user-008'], count: 1 }
      ],
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    },
    {
      id: 'msg-005-003',
      chatId: 'chat-005',
      senderId: 'user-005',
      senderName: 'Roberto Cruz',
      content: 'Branch B did 67 orders. We had a strong finish in the last week!',
      timestamp: new Date(Date.now() - 6.5 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '💪', userIds: ['user-001', 'user-002'], count: 2 }
      ],
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    },
    {
      id: 'msg-005-004',
      chatId: 'chat-005',
      senderId: 'user-008',
      senderName: 'Sofia Ramos',
      content: 'Our customer satisfaction score increased to 4.7/5! 😊',
      timestamp: new Date(Date.now() - 5 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '⭐', userIds: ['user-001', 'user-002', 'user-005'], count: 3 }
      ],
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    },
    {
      id: 'msg-005-005',
      chatId: 'chat-005',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Outstanding work everyone!',
      timestamp: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
      edited: true,
      editedAt: new Date(Date.now() - 3.5 * 60 * 60000).toISOString(),
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    },
    {
      id: 'msg-005-006',
      chatId: 'chat-005',
      senderId: 'user-001',
      senderName: 'Juan dela Cruz',
      content: 'Great job everyone! We hit 110% of our target this month! 🎉',
      timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
      reactions: [
        { emoji: '🎊', userIds: ['user-002', 'user-005', 'user-008'], count: 3 },
        { emoji: '🔥', userIds: ['user-002', 'user-005'], count: 2 }
      ],
      readBy: ['user-001', 'user-002', 'user-005', 'user-008']
    }
  ]
};
