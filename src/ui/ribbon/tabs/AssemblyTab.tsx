/**
 * src/ui/ribbon/tabs/AssemblyTab.tsx
 * Aba "Montagem" — inserir componentes e aplicar mates.
 */
import { Plus, Link2, AlignVerticalSpaceAround, Cog, AlertTriangle } from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { executeCommand } from '@/commands/parser';

export function AssemblyTab() {
  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Componentes">
        <RibbonButton icon={<Plus />} label="Inserir peça" onClick={() => executeCommand('INSERT-COMPONENT')} />
      </RibbonPanel>

      <RibbonPanel title="Mates">
        <RibbonButton icon={<Link2 />} label="Coincidente" onClick={() => executeCommand('MATE-COINCIDENT')} />
        <RibbonButton icon={<AlignVerticalSpaceAround />} label="Concêntrico" onClick={() => executeCommand('MATE-CONCENTRIC')} />
        <RibbonButton icon={<Cog />} label="Engrenagem" onClick={() => executeCommand('MATE-GEAR')} />
      </RibbonPanel>

      <RibbonPanel title="Análise">
        <RibbonButton icon={<AlertTriangle />} label="Interferência" onClick={() => executeCommand('INTERFERENCE-CHECK')} />
      </RibbonPanel>
    </div>
  );
}
