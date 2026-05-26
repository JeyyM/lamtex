import React from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, AlertCircle, Package, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ModalPortal } from '@/src/components/ui/ModalPortal';
import type { AppNotification } from '@/src/lib/notifications/types';
import { formatNotificationTime } from '@/src/lib/notifications/notificationsData';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  loading?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  notifications,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
}: NotificationsDrawerProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (category: string) => {
    switch (category) {
      case 'Approvals':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'Inventory':
        return <Package className="w-5 h-5 text-yellow-500" />;
      case 'Delivery':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <ModalPortal
      open={isOpen}
      backdropClassName="bg-black/20"
      className="flex justify-end p-0 overflow-hidden"
      onBackdropClick={onClose}
    >
      <div
        className="w-full md:w-96 bg-white h-full shadow-xl flex flex-col relative z-10 transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-5 border-b border-gray-200 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {notifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={onMarkAllRead}>
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={onClearAll}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border ${
                  notif.read ? 'bg-gray-50 border-gray-100' : 'bg-white border-red-100 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notif.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-500 uppercase">{notif.category}</span>
                        {notif.title && (
                          <p className={`text-sm mt-0.5 ${notif.read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                            {notif.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatNotificationTime(notif.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDelete(notif.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          aria-label="Remove notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm mt-1 ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notif.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => onMarkRead(notif.id)}
                          className="text-xs text-red-600 font-medium hover:text-red-700"
                        >
                          Mark as read
                        </button>
                      )}
                      {notif.actionUrl && (
                        <Link
                          to={notif.actionUrl}
                          onClick={onClose}
                          className="text-xs text-blue-600 font-medium hover:text-blue-700"
                        >
                          {notif.actionLabel ?? 'View'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
