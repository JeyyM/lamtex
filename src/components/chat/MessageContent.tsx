import React from 'react';
import Linkify from 'linkify-react';
import { FileText, Download } from 'lucide-react';
import type { ChatMessage } from '@/src/types/chat';

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

interface MessageContentProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export function MessageContent({ message, isOwnMessage }: MessageContentProps) {
  if (message.deleted) {
    return (
      <p className={`text-sm italic ${isOwnMessage ? 'text-red-100' : 'text-gray-400'}`}>
        This message was deleted
      </p>
    );
  }

  const images = (message.attachments ?? []).filter((a) => a.kind === 'image');
  const files = (message.attachments ?? []).filter((a) => a.kind === 'file');
  const linkClass = isOwnMessage ? 'underline text-red-50' : 'underline text-red-600';

  return (
    <div className="space-y-2">
      {message.content && (
        <p className="text-sm break-words whitespace-pre-wrap">
          <Linkify
            options={{
              target: '_blank',
              rel: 'noopener noreferrer',
              className: linkClass,
            }}
          >
            {message.content}
          </Linkify>
        </p>
      )}

      {images.length > 0 && (
        <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((img) => (
            <a
              key={img.url}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg"
            >
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                className="max-h-64 w-full object-cover hover:opacity-95 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}

      {files.map((file) => (
        <a
          key={file.url}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          download={file.name}
          className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors ${
            isOwnMessage ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FileText className={`w-5 h-5 flex-shrink-0 ${isOwnMessage ? 'text-red-50' : 'text-gray-500'}`} />
          <span className="flex-1 min-w-0">
            <span className="block truncate font-medium">{file.name}</span>
            {file.size > 0 && (
              <span className={`block text-xs ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                {formatBytes(file.size)}
              </span>
            )}
          </span>
          <Download className={`w-4 h-4 flex-shrink-0 ${isOwnMessage ? 'text-red-50' : 'text-gray-400'}`} />
        </a>
      ))}

      {message.linkPreview && (message.linkPreview.title || message.linkPreview.image) && (
        <a
          href={message.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block overflow-hidden rounded-lg border ${
            isOwnMessage ? 'border-red-400 bg-red-500/40' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {message.linkPreview.image && (
            <img
              src={message.linkPreview.image}
              alt={message.linkPreview.title ?? 'Link preview'}
              loading="lazy"
              className="max-h-40 w-full object-cover"
            />
          )}
          <div className="p-2.5">
            {message.linkPreview.siteName && (
              <p className={`text-[11px] uppercase tracking-wide ${isOwnMessage ? 'text-red-100' : 'text-gray-400'}`}>
                {message.linkPreview.siteName}
              </p>
            )}
            {message.linkPreview.title && (
              <p className="text-sm font-semibold leading-snug line-clamp-2">
                {message.linkPreview.title}
              </p>
            )}
            {message.linkPreview.description && (
              <p className={`text-xs leading-snug line-clamp-2 mt-0.5 ${isOwnMessage ? 'text-red-50' : 'text-gray-500'}`}>
                {message.linkPreview.description}
              </p>
            )}
          </div>
        </a>
      )}
    </div>
  );
}
