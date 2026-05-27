/**
 * src/app/App.tsx
 * Root da aplicação. Aplica o tema (claro/escuro) no <html>, registra atalhos
 * globais (undo/redo/cancel) e delega ao Layout.
 */
import { useEffect } from 'react';
import { Layout } from './Layout';
import { ErrorBoundary } from './ErrorBoundary';
import { useDocumentHistory } from '@/state/documentStore';
import { useUIStore } from '@/state/uiStore';
import { executeCommand } from '@/commands/parser';

export function App() {
  const theme = useUIStore((s) => s.theme);

  // sincroniza o tema com a classe do <html> (Tailwind darkMode: 'class')
  // e com a propriedade color-scheme (faz controles nativos respeitarem o tema)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target;
      const isInput =
        tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDocumentHistory().undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        useDocumentHistory().redo();
      } else if (e.key === 'Escape' && !isInput) {
        executeCommand('CANCEL');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  );
}
