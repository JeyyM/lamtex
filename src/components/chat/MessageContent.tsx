import React, { useState } from 'react';
import Linkify from 'linkify-react';
import {
  FileText,
  Download,
  FileImage,
  FileArchive,
  FileCode,
  Film,
  Music,
  File,
  Play,
  Maximize2,
} from 'lucide-react';
import type { ChatMessage, ChatAttachment } from '@/src/types/chat';
import { notifyLinkPreviewImageUrl } from '@/src/lib/notifyApi';

function LinkPreviewImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const proxied = src.includes('/api/link-preview-image?') ? src : notifyLinkPreviewImageUrl(src);

  return (
    <img
      src={proxied}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

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

function VideoThumbnail({
  vid,
  index,
  total,
  onVideoClick,
}: {
  vid: ChatAttachment;
  index: number;
  total: number;
  onVideoClick?: (index: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const maxH = total === 1 ? 'max-h-72' : 'max-h-48';

  if (playing) {
    return (
      <div className="relative rounded-lg overflow-hidden">
        <video
          src={vid.url}
          controls
          autoPlay
          className={`w-full rounded-lg ${maxH}`}
        />
        <button
          type="button"
          onClick={() => onVideoClick?.(index)}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors"
          title="Full screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 relative group/vid"
      title="Click to play"
    >
      <video
        src={vid.url}
        preload="metadata"
        muted
        playsInline
        className={`w-full object-cover rounded-lg pointer-events-none ${maxH}`}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/vid:bg-black/50 transition-colors rounded-lg">
        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center shadow-lg">
          <Play className="w-7 h-7 text-white ml-1" fill="white" />
        </div>
      </div>
    </button>
  );
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = className ?? 'w-5 h-5 flex-shrink-0';
  if (mimeType.startsWith('video/')) return <Film className={cls} />;
  if (mimeType.startsWith('audio/')) return <Music className={cls} />;
  if (mimeType.startsWith('image/')) return <FileImage className={cls} />;
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.startsWith('text/')
  )
    return <FileText className={cls} />;
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip')
  )
    return <FileArchive className={cls} />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.includes('html') ||
    mimeType.includes('css')
  )
    return <FileCode className={cls} />;
  return <File className={cls} />;
}

interface MessageContentProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  /** Called when user clicks an image in the message. Index is within the message's image list. */
  onImageClick?: (index: number) => void;
  /** Called when user clicks a video in the message. Index is within the message's video list. */
  onVideoClick?: (index: number) => void;
}

export function MessageContent({ message, isOwnMessage, onImageClick, onVideoClick }: MessageContentProps) {
  if (message.deleted) {
    return (
      <p className={`text-sm italic ${isOwnMessage ? 'text-red-100' : 'text-gray-400'}`}>
        This message was deleted
      </p>
    );
  }

  const images = (message.attachments ?? []).filter((a) => a.kind === 'image');
  const videos = (message.attachments ?? []).filter(
    (a) => a.kind === 'file' && a.type.startsWith('video/'),
  );
  const files = (message.attachments ?? []).filter(
    (a) => a.kind === 'file' && !a.type.startsWith('video/'),
  );
  const linkClass = isOwnMessage ? 'underline text-red-50' : 'underline text-red-600';

  const imageGridCols =
    images.length === 1
      ? 'grid-cols-1'
      : images.length === 2
        ? 'grid-cols-2'
        : images.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-2';

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
        <div className={`grid gap-1.5 ${imageGridCols}`}>
          {images.map((img, imgIdx) => (
            <button
              key={img.url}
              type="button"
              onClick={() => onImageClick?.(imgIdx)}
              className="block overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group/img"
              title="Click to view"
            >
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                className={`w-full object-cover group-hover/img:brightness-90 transition cursor-zoom-in ${
                  images.length === 1 ? 'max-h-72' : 'max-h-48'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className={`grid gap-1.5 ${videos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {videos.map((vid, vidIdx) => (
            <VideoThumbnail
              key={vid.url}
              vid={vid}
              index={vidIdx}
              total={videos.length}
              onVideoClick={onVideoClick}
            />
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
          className={`flex items-center gap-2.5 rounded-lg p-2.5 text-sm transition-colors ${
            isOwnMessage ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <span className={isOwnMessage ? 'text-red-50' : 'text-gray-500'}>
            <FileIcon mimeType={file.type} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block truncate font-medium">{file.name}</span>
            {file.size > 0 && (
              <span className={`block text-xs ${isOwnMessage ? 'text-red-100' : 'text-gray-500'}`}>
                {formatBytes(file.size)}
              </span>
            )}
          </span>
          <Download
            className={`w-4 h-4 flex-shrink-0 ${isOwnMessage ? 'text-red-50' : 'text-gray-400'}`}
          />
        </a>
      ))}

      {message.linkPreview && (message.linkPreview.title || message.linkPreview.image) && (
        <a
          href={message.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block overflow-hidden rounded-lg border transition-opacity hover:opacity-90 ${
            isOwnMessage ? 'border-red-400 bg-red-500/40' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {message.linkPreview.image && (
            <LinkPreviewImage
              src={message.linkPreview.image}
              alt={message.linkPreview.title ?? 'Link preview'}
              className="max-h-40 w-full object-cover bg-gray-100"
            />
          )}
          <div className="p-2.5">
            {message.linkPreview.siteName && (
              <p
                className={`text-[11px] uppercase tracking-wide ${
                  isOwnMessage ? 'text-red-100' : 'text-gray-400'
                }`}
              >
                {message.linkPreview.siteName}
              </p>
            )}
            {message.linkPreview.title && (
              <p className="text-sm font-semibold leading-snug line-clamp-2">
                {message.linkPreview.title}
              </p>
            )}
            {message.linkPreview.description && (
              <p
                className={`text-xs leading-snug line-clamp-2 mt-0.5 ${
                  isOwnMessage ? 'text-red-50' : 'text-gray-500'
                }`}
              >
                {message.linkPreview.description}
              </p>
            )}
          </div>
        </a>
      )}
    </div>
  );
}
