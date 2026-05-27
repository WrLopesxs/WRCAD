/**
 * src/ui/panels/forms/MirrorForm.tsx
 * Editor de feature Mirror — plano de espelhamento (XY/YZ/XZ) + opção de
 * manter o original (default = sim).
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Feature, MirrorParams } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface MirrorFormProps {
  feature: Feature;
}

const PLANES: { value: MirrorParams['plane']; label: string; hint: string }[] = [
  { value: 'YZ', label: 'YZ (espelha X)', hint: 'Esquerda ↔ direita' },
  { value: 'XZ', label: 'XZ (espelha Y)', hint: 'Cima ↔ baixo' },
  { value: 'XY', label: 'XY (espelha Z)', hint: 'Frente ↔ trás' },
];

export function MirrorForm({ feature }: MirrorFormProps) {
  const params = feature.parameters as unknown as MirrorParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<MirrorParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && <Diagnostic error={diag.error} />}

      <FieldGroup label="Plano de espelhamento">
        <div className="space-y-1">
          {PLANES.map((pl) => (
            <label
              key={pl.value}
              className={`flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                params.plane === pl.value
                  ? 'bg-accent/15 text-fg'
                  : 'hover:bg-surface-3 text-fg-muted'
              }`}
            >
              <input
                type="radio"
                name="mirror-plane"
                checked={params.plane === pl.value}
                onChange={() => update({ plane: pl.value })}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium">{pl.label}</div>
                <div className="text-[10px] text-fg-faint">{pl.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="">
        <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-3 cursor-pointer">
          <input
            type="checkbox"
            checked={params.keepOriginal !== false}
            onChange={(e) => update({ keepOriginal: e.target.checked })}
          />
          <span className="text-fg">Manter original (union do espelho)</span>
        </label>
      </FieldGroup>
    </div>
  );
}

function Diagnostic({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-[11px]">
        <AlertTriangle size={14} className="shrink-0 mt-px" />
        <span>{error}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-[11px]">
      <CheckCircle2 size={14} className="shrink-0" />
      <span>Corpo espelhado.</span>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] uppercase tracking-wider text-fg-faint font-medium">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
