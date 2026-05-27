/**
 * src/ui/ribbon/tabs/ModelingTab.tsx
 * Aba "Modelagem" — features 3D: extrude, cut-extrude, revolve, sweep, loft,
 * fillet, shell, padrões e booleanos.
 */
import {
  Box,
  Scissors,
  RotateCw,
  Move3d,
  Layers,
  CircleDot,
  Frame,
  Grid3x3,
  Repeat,
  Plus,
  Minus,
  FlipHorizontal2,
  Disc,
  Circle as CircleIcon,
  Triangle,
  Donut,
  Square,
  X as Intersect,
} from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { executeCommand } from '@/commands/parser';

export function ModelingTab() {
  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Primitivas">
        <RibbonButton icon={<Square />} label="Cubo" onClick={() => executeCommand('BOX')} shortcut="BX" />
        <RibbonButton icon={<CircleIcon />} label="Cilindro" onClick={() => executeCommand('CYLINDER')} shortcut="CYL" />
        <RibbonButton icon={<Disc />} label="Esfera" onClick={() => executeCommand('SPHERE')} shortcut="SPH" />
        <RibbonButton icon={<Triangle />} label="Cone" onClick={() => executeCommand('CONE')} shortcut="CN" />
        <RibbonButton icon={<Donut />} label="Toro" onClick={() => executeCommand('TORUS')} shortcut="TOR" />
      </RibbonPanel>

      <RibbonPanel title="Sólidos (adicionar)">
        <RibbonButton icon={<Box />} label="Extrudar" onClick={() => executeCommand('EXTRUDE')} shortcut="EXT" />
        <RibbonButton icon={<RotateCw />} label="Revolver" onClick={() => executeCommand('REVOLVE')} shortcut="REV" />
        <RibbonButton icon={<Move3d />} label="Varrer" onClick={() => executeCommand('SWEEP')} shortcut="SW" />
        <RibbonButton icon={<Layers />} label="Loft" onClick={() => executeCommand('LOFT')} shortcut="LO" />
      </RibbonPanel>

      <RibbonPanel title="Sólidos (remover)">
        <RibbonButton icon={<Scissors />} label="Corte extrudado" onClick={() => executeCommand('CUT-EXTRUDE')} shortcut="CE" />
        <RibbonButton icon={<RotateCw />} label="Corte revolver" onClick={() => executeCommand('CUT-REVOLVE')} shortcut="CR" />
        <RibbonButton icon={<Disc />} label="Furo" onClick={() => executeCommand('HOLE')} shortcut="HOL" />
      </RibbonPanel>

      <RibbonPanel title="Acabamento">
        <RibbonButton icon={<CircleDot />} label="Filete" onClick={() => executeCommand('FILLET')} shortcut="F" />
        <RibbonButton icon={<Frame />} label="Casca" onClick={() => executeCommand('SHELL')} shortcut="SH" />
      </RibbonPanel>

      <RibbonPanel title="Padrão / Espelho">
        <RibbonButton icon={<Grid3x3 />} label="Padrão Linear" onClick={() => executeCommand('PATTERN-LINEAR')} />
        <RibbonButton icon={<Repeat />} label="Pad. Circular" onClick={() => executeCommand('PATTERN-CIRCULAR')} />
        <RibbonButton icon={<FlipHorizontal2 />} label="Espelhar" onClick={() => executeCommand('MIRROR')} shortcut="MIR" />
      </RibbonPanel>

      <RibbonPanel title="Booleanos">
        <RibbonButton icon={<Plus />} label="União" onClick={() => executeCommand('BOOLEAN-UNION')} />
        <RibbonButton icon={<Minus />} label="Subtração" onClick={() => executeCommand('BOOLEAN-SUBTRACT')} />
        <RibbonButton icon={<Intersect />} label="Interseção" onClick={() => executeCommand('BOOLEAN-INTERSECT')} />
      </RibbonPanel>
    </div>
  );
}
