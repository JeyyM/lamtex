import React from 'react';
import { Link } from 'react-router-dom';

export const TABLE_ROW_LINK_CLASS =
  'group cursor-pointer hover:bg-gray-50 transition-colors focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500';

export const TABLE_ROW_CELL_CONTENT = 'relative z-0 pointer-events-none';

/** Invisible link covering a table cell — repeat on every `<td>` so the whole row is clickable. */
export function TableRowCellOverlay(props: {
  to: string;
  ariaLabel: string;
  primary?: boolean;
}): React.ReactElement {
  return (
    <Link
      to={props.to}
      tabIndex={props.primary ? undefined : -1}
      aria-hidden={props.primary ? undefined : true}
      aria-label={props.primary ? props.ariaLabel : undefined}
      title="Right-click or Ctrl+click to open in new tab"
      className="absolute inset-0 z-10 block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
    />
  );
}
