/**
 * src/app/ErrorBoundary.tsx
 * Captura exceções de render do React e mostra mensagem útil em vez de tela
 * branca. Mostra o stack pra facilitar debug.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack?: string }): void {
    console.error('[WRCAD] crash:', error, info);
  }

  reset = () => this.setState({ error: null });

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-canvas text-fg p-8">
        <div className="max-w-2xl w-full floating-panel p-6 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-red-500">Ops — algo quebrou</h1>
            <p className="text-sm text-fg-muted mt-1">
              O React travou tentando renderizar. Detalhes abaixo. Clique em
              "Tentar continuar" para recuperar; se persistir, recarregue a página.
            </p>
          </div>
          <pre className="text-xs bg-canvas border border-edge rounded p-3 overflow-auto max-h-64 font-mono text-fg">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="px-3 py-1.5 rounded-md bg-accent text-[rgb(var(--color-accent-contrast))] font-medium text-xs hover:bg-accent-hover transition-colors"
            >
              Tentar continuar
            </button>
            <button
              type="button"
              onClick={() => location.reload()}
              className="px-3 py-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-surface-2 text-xs transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
