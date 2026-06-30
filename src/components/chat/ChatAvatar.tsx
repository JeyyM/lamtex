import React from 'react';
import { Users } from 'lucide-react';

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const SIZE_CLASS = {
  xs: 'w-10 h-10 text-sm',
  sm: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
} as const;

const ICON_CLASS = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  lg: 'w-9 h-9',
} as const;

type Props = {
  type: 'direct' | 'group';
  displayName: string;
  avatarUrl?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function ChatAvatar({
  type,
  displayName,
  avatarUrl,
  size = 'sm',
  className = '',
}: Props): React.ReactElement {
  const sizeClass = SIZE_CLASS[size];
  const iconClass = ICON_CLASS[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
    >
      {type === 'group' ? (
        <Users className={iconClass} />
      ) : (
        getUserInitials(displayName)
      )}
    </div>
  );
}
