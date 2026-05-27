/**
 * src/ui/ribbon/tabs/SketchTab.tsx
 * Aba "Esboço" — desenho 2D, modificação, restrições e saída do esboço.
 */
import {
  PenLine,
  Circle,
  Square,
  Spline,
  Pencil,
  Scissors,
  Copy,
  FlipHorizontal2,
  RotateCcw,
  Ruler,
  CornerDownLeft,
  CornerUpRight,
  CheckCircle2,
  Minus,
} from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { executeCommand } from '@/commands/parser';

export function SketchTab() {
  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Desenhar">
        <RibbonButton icon={<PenLine />} label="Linha" onClick={() => executeCommand('LINE')} shortcut="L" />
        <RibbonButton icon={<Circle />} label="Círculo" onClick={() => executeCommand('CIRCLE')} shortcut="C" />
        <RibbonButton icon={<Square />} label="Retângulo" onClick={() => executeCommand('RECTANG')} shortcut="REC" />
        <RibbonButton icon={<CornerUpRight />} label="Arco" onClick={() => executeCommand('ARC')} shortcut="A" />
        <RibbonButton icon={<Spline />} label="Spline" onClick={() => executeCommand('SPLINE')} shortcut="SPL" />
        <RibbonButton icon={<Pencil />} label="Polilinha" onClick={() => executeCommand('PLINE')} shortcut="PL" />
        <RibbonButton icon={<Minus />} label="Linha de eixo" onClick={() => executeCommand('CLINE')} shortcut="CL" />
      </RibbonPanel>

      <RibbonPanel title="Modificar">
        <RibbonButton icon={<Scissors />} label="Aparar" onClick={() => executeCommand('TRIM')} shortcut="TR" />
        <RibbonButton icon={<CornerDownLeft />} label="Estender" onClick={() => executeCommand('EXTEND')} shortcut="EX" />
        <RibbonButton icon={<Copy />} label="Copiar" onClick={() => executeCommand('COPY')} shortcut="CO" />
        <RibbonButton icon={<FlipHorizontal2 />} label="Espelhar" onClick={() => executeCommand('MIRROR')} shortcut="MI" />
        <RibbonButton icon={<RotateCcw />} label="Girar" onClick={() => executeCommand('ROTATE')} shortcut="RO" />
      </RibbonPanel>

      <RibbonPanel title="Restrições">
        <RibbonButton icon={<Ruler />} label="Cota inteligente" onClick={() => executeCommand('DIMENSION')} shortcut="DI" />
      </RibbonPanel>

      <RibbonPanel title="Sair">
        <RibbonButton
          icon={<CheckCircle2 />}
          label="Concluir esboço"
          onClick={() => executeCommand('FINISH-SKETCH')}
          primary
        />
      </RibbonPanel>
    </div>
  );
}
