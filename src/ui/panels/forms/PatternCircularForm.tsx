/**
 * src/ui/panels/forms/PatternCircularForm.tsx
 * Editor de Pattern Circular — eixo de rotação (X/Y/Z), contagem, ângulo total.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Feature, PatternCircularParams } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface PatternCircularFormProps {
  feature: Feature;
}

const AXES: { value: PatternCircularParams['axis']; label: string; hint: string }[] = [
  { value: 'X', label: 'X', hint: 'horizontal esq↔dir' },
  { value: 'Y', label: 'Y', hint: 'vertical' },
  { value: 'Z', label: 'Z', hint: 'horizontal frente↔trás' },
];

export function PatternCircularForm({ feature }: PatternCircularFormProps) {
  const params = feature.parameters as unknown as PatternCircularParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<PatternCircularParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && <Diagnostic error={diag.error} />}

      <FieldGroup label="Eixo de rotação">
        <div className="flex gap-1">
          {AXES.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => update({ axis: a.value })}
              title={a.hint}
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
        <p className="text-[10px] text-fg-faint mt-1">
          Passa pela origem (0, 0, 0). Posicione o esboço considerando isso.
        </p>
      </FieldGroup>

      <FieldGroup label="Quantidade total">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={2}
            max={24}
            step={1}
            value={params.count}
            onChange={(e) => update({ count: parseInt(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={2}
            max={64}
            step={1}
            value={params.count}
            onChange={(e) =>
              update({ count: Math.max(2, Math.min(64, parseInt(e.target.value) || 2)) })
            }
            className="form-input w-16 text-right"
          />
        </div>
      </FieldGroup>

      <FieldGroup label="Ângulo total (graus)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={360}
            step={1}
            value={params.totalAngle}
            onChange={(e) => update({ totalAngle: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={1}
            max={360}
            step={1}
            value={params.totalAngle}
            onChange={(e) =>
              update({
                totalAngle: Math.max(1, Math.min(360, parseFloat(e.target.value) || 360)),
              })
            }
            className="form-input w-16 text-right"
          />
        </div>
        <div className="flex gap-1 pt-1">
          {[90, 180, 270, 360].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => update({ totalAngle: a })}
              className="flex-1 py-1 text-[10px] rounded border border-edge bg-surface-2 hover:border-accent hover:text-accent transition-colors"
            >
              {a}°
            </button>
          ))}
        </div>
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
      <span>Padrão circular aplicado.</span>
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
