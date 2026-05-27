/**
 * src/ui/ribbon/tabs/HomeTab.tsx
 * Aba "Início" — file ops, histórico, clipboard.
 */
import {
  FilePlus2,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Download,
} from 'lucide-react';
import { RibbonPanel } from '../RibbonPanel';
import { RibbonButton } from '../RibbonButton';
import { executeCommand } from '@/commands/parser';
import { useDocumentStore, useDocumentHistory } from '@/state/documentStore';
import {
  saveDocumentAsJSON,
  openDocumentFromJSON,
  exportDocumentAsSTL,
} from '@/commands/io/fileOps';

export function HomeTab() {
  const newDoc = useDocumentStore((s) => s.newDocument);

  return (
    <div className="flex items-stretch px-2 py-1.5 divide-x divide-edge/60">
      <RibbonPanel title="Arquivo">
        <RibbonButton
          icon={<FilePlus2 />}
          label="Nova Peça"
          onClick={() => newDoc('part')}
          shortcut="Ctrl+N"
        />
        <RibbonButton
          icon={<FolderOpen />}
          label="Abrir"
          onClick={openDocumentFromJSON}
          shortcut="Ctrl+O"
        />
        <RibbonButton
          icon={<Save />}
          label="Salvar"
          onClick={saveDocumentAsJSON}
          shortcut="Ctrl+S"
        />
      </RibbonPanel>

      <RibbonPanel title="Exportar">
        <RibbonButton
          icon={<Download />}
          label="STL (impressão 3D)"
          onClick={exportDocumentAsSTL}
        />
      </RibbonPanel>

      <RibbonPanel title="Histórico">
        <RibbonButton
          icon={<Undo2 />}
          label="Desfazer"
          onClick={() => useDocumentHistory().undo()}
          shortcut="Ctrl+Z"
        />
        <RibbonButton
          icon={<Redo2 />}
          label="Refazer"
          onClick={() => useDocumentHistory().redo()}
          shortcut="Ctrl+Y"
        />
      </RibbonPanel>

      <RibbonPanel title="Área de transferência">
        <RibbonButton
          icon={<Scissors />}
          label="Recortar"
          onClick={() => executeCommand('CUT')}
          shortcut="Ctrl+X"
        />
        <RibbonButton
          icon={<Copy />}
          label="Copiar"
          onClick={() => executeCommand('COPY')}
          shortcut="Ctrl+C"
        />
        <RibbonButton
          icon={<ClipboardPaste />}
          label="Colar"
          onClick={() => executeCommand('PASTE')}
          shortcut="Ctrl+V"
        />
      </RibbonPanel>
    </div>
  );
}
