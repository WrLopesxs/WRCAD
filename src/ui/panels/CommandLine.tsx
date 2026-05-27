/**
 * src/ui/panels/CommandLine.tsx
 * Console flutuante centralizado no rodapé. Mostra prompt + input + histórico
 * recente. Auto-foco quando o usuário começa a digitar fora de outro input.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Terminal } from 'lucide-react';
import { useCommandStore } from '@/state/commandStore';
import { executeCommand } from '@/commands/parser';

export function CommandLine() {
  const current = useCommandStore((s) => s.current);
  const prompt = useCommandStore((s) => s.prompt);
  const history = useCommandStore((s) => s.history);
  const setCurrent = useCommandStore((s) => s.setCurrent);

  const [historyOpen, setHistoryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target;
      if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') executeCommand('CANCEL');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="floating-panel overflow-hidden font-mono text-[11px]">
      {historyOpen && (
        <>
          <div
            ref={scrollRef}
            className="max-h-32 overflow-y-auto px-3 py-2 space-y-0.5 bg-canvas/40"
          >
            {history.map((h, i) => (
              <div key={i} className={historyClass(h.kind)}>
                {h.text}
              </div>
            ))}
          </div>
          <div className="hairline opacity-70" />
        </>
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          title={historyOpen ? 'Ocultar histórico' : 'Mostrar histórico'}
          className="text-fg-faint hover:text-fg transition-colors"
        >
          <Terminal size={13} />
        </button>
        <ChevronRight size={12} className="text-accent shrink-0" />
        <span className="text-accent shrink-0 select-none">{prompt}</span>
        <input
          ref={inputRef}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              executeCommand(current);
            } else if (e.key === ' ' && current.trim()) {
              e.preventDefault();
              executeCommand(current);
            } else if (e.key === 'Escape') {
              executeCommand('CANCEL');
            }
          }}
          className="flex-1 bg-transparent outline-none text-fg placeholder:text-fg-faint min-w-0"
          placeholder="LINE, CIRCLE, EXTRUDE… (ou L, C, EXT)"
          spellCheck={false}
          autoComplete="off"
        />
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-fg-faint bg-surface-2 rounded border border-edge">
          ↵
        </kbd>
      </div>
    </div>
  );
}

function historyClass(kind: 'input' | 'prompt' | 'info' | 'error'): string {
  switch (kind) {
    case 'input':
      return 'text-fg';
    case 'prompt':
      return 'text-accent';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-fg-muted';
  }
}
