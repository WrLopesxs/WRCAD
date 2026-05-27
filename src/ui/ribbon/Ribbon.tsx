/**
 * src/ui/ribbon/Ribbon.tsx
 * Header de identidade + abas tipográficas + área de conteúdo.
 * Gradiente sutil no header para dar densidade visual sem poluir.
 */
import * as Tabs from '@radix-ui/react-tabs';
import { Box, ChevronDown } from 'lucide-react';
import { useUIStore } from '@/state/uiStore';
import { useDocumentStore } from '@/state/documentStore';
import type { RibbonTab } from '@/domain/types';
import { HomeTab, SketchTab, ModelingTab, AssemblyTab, AnnotateTab, ViewTab } from './tabs';

interface TabConfig {
  value: RibbonTab;
  label: string;
}

const TABS: TabConfig[] = [
  { value: 'home', label: 'Início' },
  { value: 'sketch', label: 'Esboço' },
  { value: 'modeling', label: 'Modelagem' },
  { value: 'assembly', label: 'Montagem' },
  { value: 'annotate', label: 'Anotação' },
  { value: 'view', label: 'Visualização' },
];

export function Ribbon() {
  const ribbonTab = useUIStore((s) => s.ribbonTab);
  const setRibbonTab = useUIStore((s) => s.setRibbonTab);
  const docName = useDocumentStore((s) => s.doc.name);
  const docKind = useDocumentStore((s) => s.doc.kind);

  return (
    <Tabs.Root
      value={ribbonTab}
      onValueChange={(v) => setRibbonTab(v as RibbonTab)}
      className="relative z-20 bg-surface border-b border-edge"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgb(var(--color-surface) / 1) 0%, rgb(var(--color-surface-2) / 0.5) 100%)',
      }}
    >
      <Tabs.List className="flex items-stretch h-11">
        <div className="flex items-center gap-2.5 pl-3 pr-4 border-r border-edge">
          <div
            className="w-7 h-7 grid place-items-center rounded-lg shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-accent-hover)) 100%)',
              color: 'rgb(var(--color-accent-contrast))',
            }}
          >
            <Box size={15} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight text-fg">WRCAD</span>
            <span className="text-[9px] text-fg-faint uppercase tracking-[0.12em]">
              WR Solution
            </span>
          </div>
        </div>

        {TABS.map((t) => {
          const active = ribbonTab === t.value;
          return (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className={`relative px-4 text-xs font-medium transition-colors focus-visible:outline-none ${
                active ? 'text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
              {active && (
                <span
                  className="absolute left-2 right-2 bottom-[-1px] h-[2px] rounded-full bg-accent"
                  style={{
                    boxShadow:
                      '0 0 12px rgb(var(--color-accent) / 0.6), 0 0 4px rgb(var(--color-accent) / 0.8)',
                  }}
                />
              )}
            </Tabs.Trigger>
          );
        })}

        <button
          type="button"
          className="ml-auto mr-3 flex items-center gap-2 px-3 py-1 rounded-lg text-xs hover:bg-surface-2 transition-colors group"
        >
          <span
            className="w-2 h-2 rounded-full bg-accent"
            style={{ boxShadow: '0 0 8px rgb(var(--color-accent) / 0.6)' }}
          />
          <span className="text-fg-faint">
            {docKind === 'part' ? 'Peça' : docKind === 'assembly' ? 'Montagem' : 'Desenho'}
          </span>
          <span className="text-fg font-medium truncate max-w-[200px]">{docName}</span>
          <ChevronDown size={12} className="text-fg-faint group-hover:text-fg transition-colors" />
        </button>
      </Tabs.List>

      <div className="border-t border-edge/70">
        <Tabs.Content value="home"><HomeTab /></Tabs.Content>
        <Tabs.Content value="sketch"><SketchTab /></Tabs.Content>
        <Tabs.Content value="modeling"><ModelingTab /></Tabs.Content>
        <Tabs.Content value="assembly"><AssemblyTab /></Tabs.Content>
        <Tabs.Content value="annotate"><AnnotateTab /></Tabs.Content>
        <Tabs.Content value="view"><ViewTab /></Tabs.Content>
      </div>
    </Tabs.Root>
  );
}
