/**
 * src/ui/ribbon/RibbonPanel.tsx
 * Agrupador de botões com título pequeninho all-caps. O divisor vertical entre
 * painéis é aplicado pelo container pai (`divide-x divide-edge/60`).
 */
import type { ReactNode } from 'react';

interface RibbonPanelProps {
  title: string;
  children: ReactNode;
}

export function RibbonPanel({ title, children }: RibbonPanelProps) {
  return (
    <div className="flex flex-col items-stretch px-3 pb-1 pt-1">
      <div className="flex items-end gap-0.5 flex-1">{children}</div>
      <div className="text-[9px] text-fg-faint text-center mt-1 uppercase tracking-[0.12em] font-medium">
        {title}
      </div>
    </div>
  );
}
