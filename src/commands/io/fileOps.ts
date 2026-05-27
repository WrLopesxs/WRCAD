/**
 * src/commands/io/fileOps.ts
 * Operações de arquivo: salvar JSON, abrir JSON, exportar STL.
 * Tudo invocável de qualquer lugar — disparam file picker / download.
 */
import { useDocumentStore } from '@/state/documentStore';
import { useCommandStore } from '@/state/commandStore';
import { clearEvaluatorCache } from '@/engine/evaluator';
import { exportToSTL } from '@/engine/exporters/stl';
import type { CADDocument } from '@/domain/types';

/** Baixa o documento atual como JSON nativo do WRCAD. */
export function saveDocumentAsJSON(): void {
  const doc = useDocumentStore.getState().doc;
  const json = useDocumentStore.getState().saveAsJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitize(doc.name) || 'wrcad-document'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  useCommandStore.getState().log({
    text: `Salvo: ${a.download}`,
    kind: 'info',
  });
}

/** Abre um file picker pra carregar um JSON salvo anteriormente. */
export function openDocumentFromJSON(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.style.display = 'none';

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as CADDocument;
        if (!parsed.id || !parsed.features || !parsed.sketches) {
          throw new Error('Arquivo não parece um documento WRCAD válido.');
        }
        clearEvaluatorCache(); // descarta caches do doc anterior
        useDocumentStore.getState().loadDocument(parsed);
        useCommandStore.getState().log({
          text: `Aberto: ${parsed.name} (${parsed.features.length} features).`,
          kind: 'info',
        });
      } catch (err) {
        useCommandStore.getState().log({
          text: `Erro ao abrir: ${err instanceof Error ? err.message : String(err)}`,
          kind: 'error',
        });
      }
    };
    reader.onerror = () => {
      useCommandStore.getState().log({
        text: 'Erro ao ler arquivo.',
        kind: 'error',
      });
    };
    reader.readAsText(file);
  };
  input.click();
}

/** Exporta o corpo final como STL binário. */
export function exportDocumentAsSTL(): void {
  const doc = useDocumentStore.getState().doc;
  try {
    const result = exportToSTL(doc);
    useCommandStore.getState().log({
      text: `STL exportado: ${result.filename} (${formatBytes(result.bytes)})`,
      kind: 'info',
    });
  } catch (err) {
    useCommandStore.getState().log({
      text: `Erro no export STL: ${err instanceof Error ? err.message : String(err)}`,
      kind: 'error',
    });
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
