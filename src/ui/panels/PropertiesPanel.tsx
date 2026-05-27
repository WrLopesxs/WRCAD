/**
 * src/ui/panels/PropertiesPanel.tsx
 * Painel flutuante. Empty state ilustrado; com seleção, despacha para o form
 * específico daquele tipo de feature.
 */
import { Settings2, MousePointerClick, ChevronDown } from 'lucide-react';
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { useUIStore } from '@/state/uiStore';
import { ExtrudeForm } from './forms/ExtrudeForm';
import { RevolveForm } from './forms/RevolveForm';
import { MirrorForm } from './forms/MirrorForm';
import { PatternLinearForm } from './forms/PatternLinearForm';
import { PatternCircularForm } from './forms/PatternCircularForm';
import { HoleForm } from './forms/HoleForm';
import { PrimitiveForm } from './forms/PrimitiveForm';
import type { Feature } from '@/domain/types';

export function PropertiesPanel() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const feature = useDocumentStore((s) =>
    s.doc.features.find((f) => selectedIds.includes(f.id)),
  );
  const viewStyle = useUIStore((s) => s.viewStyle);
  const units = useDocumentStore((s) => s.doc.units);

  return (
    <aside className="floating-panel h-full flex flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-fg-muted">
        <Settings2 size={11} className="text-accent" />
        Propriedades
      </header>
      <div className="hairline opacity-70" />

      {!feature ? (
        <EmptyState viewStyle={viewStyle} units={units} />
      ) : (
        <FeatureEditor feature={feature} />
      )}
    </aside>
  );
}

function FeatureEditor({ feature }: { feature: Feature }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
      <div className="bg-surface-2 rounded-lg p-3 space-y-2">
        <Row label="Nome" value={feature.name} />
        <Row label="Tipo" value={feature.type} mono />
        <Row
          label="Estado"
          value={feature.suppressed ? 'suprimida' : feature.errored ? 'erro' : 'ativa'}
        />
      </div>

      {(feature.type === 'extrude' || feature.type === 'cut-extrude') && (
        <FormCard
          title={
            feature.type === 'cut-extrude'
              ? 'Parâmetros do Corte'
              : 'Parâmetros de Extrusão'
          }
        >
          <ExtrudeForm feature={feature} />
        </FormCard>
      )}

      {(feature.type === 'revolve' || feature.type === 'cut-revolve') && (
        <FormCard
          title={
            feature.type === 'cut-revolve'
              ? 'Parâmetros do Corte por Revolução'
              : 'Parâmetros de Revolução'
          }
        >
          <RevolveForm feature={feature} />
        </FormCard>
      )}

      {feature.type === 'mirror' && (
        <FormCard title="Parâmetros do Espelhamento">
          <MirrorForm feature={feature} />
        </FormCard>
      )}

      {feature.type === 'pattern-linear' && (
        <FormCard title="Parâmetros do Padrão Linear">
          <PatternLinearForm feature={feature} />
        </FormCard>
      )}

      {feature.type === 'pattern-circular' && (
        <FormCard title="Parâmetros do Padrão Circular">
          <PatternCircularForm feature={feature} />
        </FormCard>
      )}

      {feature.type === 'hole' && (
        <FormCard title="Parâmetros do Furo">
          <HoleForm feature={feature} />
        </FormCard>
      )}

      {feature.type === 'primitive' && (
        <FormCard title="Forma Primitiva">
          <PrimitiveForm feature={feature} />
        </FormCard>
      )}

      {feature.type !== 'extrude' &&
        feature.type !== 'cut-extrude' &&
        feature.type !== 'revolve' &&
        feature.type !== 'cut-revolve' &&
        feature.type !== 'mirror' &&
        feature.type !== 'pattern-linear' &&
        feature.type !== 'pattern-circular' &&
        feature.type !== 'hole' &&
        feature.type !== 'primitive' && (
        <details className="bg-surface-2 rounded-lg overflow-hidden group" open>
          <summary className="cursor-pointer px-3 py-2 text-fg-muted hover:bg-surface-3 select-none flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-medium">Parâmetros (read-only)</span>
            <ChevronDown
              size={12}
              className="transition-transform group-open:rotate-180 text-fg-faint"
            />
          </summary>
          <pre className="p-3 text-[10px] bg-canvas text-fg overflow-x-auto font-mono leading-relaxed border-t border-edge">
{JSON.stringify(feature.parameters, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-2 rounded-lg p-3">
      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-fg-muted mb-3">
        {title}
      </h4>
      {children}
    </section>
  );
}

function EmptyState({ viewStyle, units }: { viewStyle: string; units: string }) {
  return (
    <div className="flex-1 flex flex-col p-5 text-xs overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center text-fg-faint min-h-[180px]">
        <div
          className="w-14 h-14 rounded-2xl grid place-items-center mb-3"
          style={{
            background:
              'linear-gradient(135deg, rgb(var(--color-surface-2)) 0%, rgb(var(--color-surface-3)) 100%)',
          }}
        >
          <MousePointerClick size={22} className="text-fg-muted opacity-80" />
        </div>
        <p className="text-fg font-medium">Nada selecionado</p>
        <p className="mt-1 text-[11px] leading-relaxed opacity-80 max-w-[200px]">
          Clique numa feature da árvore ou no viewport para ver e editar parâmetros.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-y-2 text-[11px] pt-3 border-t border-edge mt-auto">
        <dt className="text-fg-faint uppercase tracking-wider text-[9px]">Exibição</dt>
        <dd className="text-fg text-right">{viewStyle}</dd>
        <dt className="text-fg-faint uppercase tracking-wider text-[9px]">Unidades</dt>
        <dd className="text-fg text-right">{units}</dd>
      </dl>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-fg-faint text-[10px] uppercase tracking-wider">{label}</span>
      <span className={`text-fg truncate ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
    </div>
  );
}
