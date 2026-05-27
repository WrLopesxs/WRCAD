/**
 * src/ui/panels/forms/PatternLinearForm.tsx
 * Editor de Pattern Linear — eixo (X/Y/Z), sentido (+/-), contagem, espaçamento.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Feature, PatternLinearParams } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface PatternLinearFormProps {
  feature: Feature;
}

const AXES: { value: PatternLinearParams['axis']; label: string }[] = [
  { value: 'X', label: 'X' },
  { value: 'Y', label: 'Y' },
  { value: 'Z', label: 'Z' },
];

export function PatternLinearForm({ feature }: PatternLinearFormProps) {
  const params = feature.parameters as unknown as PatternLinearParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<PatternLinearParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && <Diagnostic error={diag.error} />}

      <FieldGroup label="Eixo">
        <div className="flex gap-1">
          {AXES.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => update({ axis: a.value })}
              className={`flex-1 py-1.5 rounded border transition-colors font-mono ${
                params.axis === a.value
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface-2 border-edge text-fg-muted hover:border-edge-strong'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Sentido">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => update({ sign: 1 })}
            className={`flex-1 py-1.5 rounded border transition-colors ${
              params.sign === 1
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface-2 border-edge text-fg-muted hover:border-edge-strong'
            }`}
          >
            +{params.axis} →
          </button>
          <button
            type="button"
            onClick={() => update({ sign: -1 })}
            className={`flex-1 py-1.5 rounded border transition-colors ${
              params.sign === -1
                ? 'bg-accent/15 border-accent text-accent'
                : 'bg-surface-2 border-edge text-fg-muted hover:border-edge-strong'
            }`}
          >
            ← −{params.axis}
          </button>
        </div>
      </FieldGroup>

      <FieldGroup label="Quantidade total">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={params.count}
            onChange={(e) => update({ count: parseInt(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={2}
            max={50}
            step={1}
            value={params.count}
            onChange={(e) =>
              update({ count: Math.max(2, Math.min(50, parseInt(e.target.value) || 2)) })
            }
            className="form-input w-16 text-right"
          />
        </div>
      </FieldGroup>

      <FieldGroup label="Espaçamento (mm)">
        <input
          type="number"
          min={0.1}
          step={0.5}
          value={params.spacing}
          onChange={(e) => update({ spacing: parseFloat(e.target.value) || 0.1 })}
          className="form-input"
        />
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
      <span>Padrão aplicado.</span>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-fg-faint font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
