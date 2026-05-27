/**
 * src/ui/ribbon/RibbonButton.tsx
 * Botão do ribbon — ícone em quadrado destacado, label discreta abaixo.
 * Hover: superfície aparece + ícone vira accent; primário: gradiente accent.
 */
import type { ReactNode } from 'react';

interface RibbonButtonProps {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export function RibbonButton({
  icon,
  label,
  shortcut,
  onClick,
  primary = false,
  disabled = false,
}: RibbonButtonProps) {
  const title = shortcut ? `${label}  ·  ${shortcut}` : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`group flex flex-col items-center justify-start gap-1 px-1.5 py-1 min-w-[58px] rounded-lg text-[11px] leading-tight transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
        primary ? '' : 'hover:bg-surface-2'
      }`}
    >
      <span
        className={`w-9 h-9 grid place-items-center rounded-md transition-all ${
          primary
            ? 'text-[rgb(var(--color-accent-contrast))] shadow-sm'
            : 'text-fg-muted group-hover:text-accent group-hover:scale-105'
        }`}
        style={
          primary
            ? {
                background:
                  'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-accent-hover)) 100%)',
              }
            : undefined
        }
      >
        {icon}
      </span>
      <span className={`text-center max-w-[72px] truncate ${primary ? 'text-fg font-medium' : 'text-fg-muted group-hover:text-fg'}`}>
        {label}
      </span>
    </button>
  );
}
