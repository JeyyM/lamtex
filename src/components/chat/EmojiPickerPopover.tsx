import React from 'react';
import { EmojiPicker } from 'frimousse';

interface EmojiPickerPopoverProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

/** Lightweight emoji picker (frimousse) styled for the chat UI. */
export function EmojiPickerPopover({ onSelect, className }: EmojiPickerPopoverProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden ${className ?? ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <EmojiPicker.Root
        className="isolate flex h-[320px] w-[300px] flex-col bg-white"
        onEmojiSelect={({ emoji }) => onSelect(emoji)}
      >
        <EmojiPicker.Search
          className="z-10 mx-2 mt-2 appearance-none rounded-md bg-gray-100 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Search emoji…"
        />
        <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
          <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            No emoji found.
          </EmojiPicker.Empty>
          <EmojiPicker.List
            className="select-none pb-1.5"
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div
                  className="bg-white px-3 pt-3 pb-1.5 text-xs font-semibold text-gray-500"
                  {...props}
                >
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div className="scroll-my-1.5 px-1.5" {...props}>
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <button
                  className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-gray-100"
                  {...props}
                >
                  {emoji.emoji}
                </button>
              ),
            }}
          />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </div>
  );
}
