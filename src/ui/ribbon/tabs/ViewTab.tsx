/**
 * src/ui/ribbon/tabs/ViewTab.tsx
 * Aba "Visualização" — estilos de render, painéis visíveis, projeções.
 */
import { Eye, Sun, Layers3, PanelLeft, PanelRight, Terminal } from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { useUIStore } from '@/state/uiStore';

export function ViewTab() {
  const setViewStyle = useUIStore((s) => s.setViewStyle);
  const togglePanel = useUIStore((s) => s.togglePanel);

  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Estilo de exibição">
        <RibbonButton icon={<Eye />} label="Wireframe" onClick={() => setViewStyle('wireframe')} />
        <RibbonButton icon={<Layers3 />} label="Sombreado" onClick={() => setViewStyle('shaded')} />
        <RibbonButton icon={<Sun />} label="Som. + Arestas" onClick={() => setViewStyle('shaded-edges')} />
      </RibbonPanel>

      <RibbonPanel title="Painéis">
        <RibbonButton icon={<PanelLeft />} label="Árvore" onClick={() => togglePanel('featureTree')} />
        <RibbonButton icon={<PanelRight />} label="Propriedades" onClick={() => togglePanel('properties')} />
        <RibbonButton icon={<Terminal />} label="Linha de comando" onClick={() => togglePanel('commandLine')} />
      </RibbonPanel>
    </div>
  );
}
