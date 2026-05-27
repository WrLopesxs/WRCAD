/**
 * src/ui/ribbon/tabs/AnnotateTab.tsx
 * Aba "Anotação" — cotas, textos, marcadores, símbolos.
 */
import { Ruler, Circle, Diameter, Type, Hash } from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { executeCommand } from '@/commands/parser';

export function AnnotateTab() {
  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Cotas">
        <RibbonButton icon={<Ruler />} label="Linear" onClick={() => executeCommand('DIMLINEAR')} shortcut="DLI" />
        <RibbonButton icon={<Circle />} label="Raio" onClick={() => executeCommand('DIMRADIUS')} shortcut="DRA" />
        <RibbonButton icon={<Diameter />} label="Diâmetro" onClick={() => executeCommand('DIMDIAMETER')} shortcut="DDI" />
        <RibbonButton icon={<Hash />} label="Angular" onClick={() => executeCommand('DIMANGULAR')} />
      </RibbonPanel>

      <RibbonPanel title="Texto">
        <RibbonButton icon={<Type />} label="Texto" onClick={() => executeCommand('TEXT')} shortcut="T" />
      </RibbonPanel>
    </div>
  );
}
