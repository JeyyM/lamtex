import React from 'react';
import { NotificationItem } from '@/src/types/executive';
import { X, CheckCircle, AlertCircle, Package, DollarSign } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
}

export function NotificationsDrawer({ isOpen, onClose, notifications, onMarkRead }: NotificationsDrawerProps) {
  if (!isOpen) return null;

  const getIcon = (category: string) => {
    switch (category) {
      case 'Approvals': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'Inventory': return <Package className="w-5 h-5 text-yellow-500" />;
      case 'Delivery': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Payment': return <DollarSign className="w-5 h-5 text-green-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="w-96 bg-white h-full shadow-xl flex flex-col relative z-10 transform transition-transform duration-300">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-4 rounded-lg border ${notif.read ? 'bg-gray-50 border-gray-100' : 'bg-white border-red-100 shadow-sm'}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(notif.category)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">{notif.category}</span>
                    <span className="text-xs text-gray-400">{notif.time}</span>
                  </div>
                  <p className={`text-sm mt-1 ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {notif.message}
                  </p>
                  {!notif.read && (
                    <button 
                      onClick={() => onMarkRead(notif.id)}
                      className="text-xs text-red-600 font-medium mt-2 hover:text-red-700"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
