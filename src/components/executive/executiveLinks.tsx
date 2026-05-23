import React from 'react';
import { Link } from 'react-router-dom';

/** Inline entity link — matches Finance / customer list styling. */
export const DASH_LINK_CLASS =
  'text-blue-600 hover:text-blue-800 hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm';

export const DASH_LINK_MONO_CLASS =
  'font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm';

export const DASH_LINK_SUBTLE_CLASS =
  'text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm';

export function DashLink(props: {
  to: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      title={props.title ?? 'Right-click or Ctrl+click to open in new tab'}
      className={props.className ?? DASH_LINK_CLASS}
    >
      {props.children}
    </Link>
  );
}

/** Full-width queue row (PR, PO, IBR, low-stock, top lists). */
export function DashQueueLink(props: {
  to: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      title={props.title ?? 'Right-click or Ctrl+click to open in new tab'}
      className={`block w-full text-left no-underline text-inherit transition-colors cursor-pointer ${props.className ?? ''}`}
    >
      {props.children}
    </Link>
  );
}

/** Entire table row navigates to one destination (new-tab friendly). */
export function DashTableRowLink(props: {
  to: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      title={props.title ?? 'Right-click or Ctrl+click to open in new tab'}
      className={`table-row border-b border-gray-100 hover:bg-gray-50 cursor-pointer no-underline text-inherit transition-colors align-middle ${props.className ?? ''}`}
    >
      {props.children}
    </Link>
  );
}

/** Small outline action in card headers (All orders, Open finance, …). */
export function DashHeaderLink(props: {
  to: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      title="Right-click or Ctrl+click to open in new tab"
      className={
        props.className ??
        'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors no-underline'
      }
    >
      {props.children}
    </Link>
  );
}
