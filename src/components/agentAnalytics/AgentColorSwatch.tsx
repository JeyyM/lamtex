import React from 'react';
import { agentChartColor } from '@/src/lib/agentAnalytics';

interface Props {
  agentId: string;
  /** Tailwind size class — default w-2.5 h-2.5 */
  sizeClassName?: string;
  className?: string;
  title?: string;
}

/** Small dot showing an agent's stable identity color. */
export function AgentColorSwatch({
  agentId,
  sizeClassName = 'w-2.5 h-2.5',
  className = '',
  title,
}: Props): React.ReactElement {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${sizeClassName} ${className}`}
      style={{ backgroundColor: agentChartColor(agentId) }}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
