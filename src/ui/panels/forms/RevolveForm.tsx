/**
 * src/ui/panels/forms/RevolveForm.tsx
 * Editor de feature Revolve — ângulo (1–360°) + direção. Edição ao vivo.
 */
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { Feature } from '@/domain/types';
import type { RevolveParams } from '@/domain/features/Revolve';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface RevolveFormProps {
  feature: Feature;
}

const DIRECTIONS: { value: RevolveParams['direction']; label: string }[] = [
  { value: 'normal', label: 'Normal (anti-horário)' },
  { value: 'reverse', label: 'Reverso (horário)' },
  { value: 'midplane', label: 'Meio plano (simétrico)' },
];

export function RevolveForm({ feature }: RevolveFormProps) {
  const params = feature.parameters as unknown as RevolveParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<RevolveParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && <Diagnostic error={diag.error} />}

      <FieldGroup label="Ângulo (graus)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={360}
            step={1}
            value={params.angle}
            onChange={(e) => update({ angle: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={1}
            max={360}
            step={1}
            value={params.angle}
            onChange={(e) =>
              update({
                angle: Math.max(1, Math.min(360, parseFloat(e.target.value) || 360)),
              })
            }
            className="form-input w-20 text-right"
          />
        </div>
        <QuickAngleButtons onPick={(a) => update({ angle: a })} />
      </FieldGroup>

      <FieldGroup label="Direção">
        <select
          value={params.direction}
          onChange={(e) =>
            update({ direction: e.target.value as RevolveParams['direction'] })
          }
          className="w-full"
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </FieldGroup>

      <div className="flex items-start gap-2 p-2 rounded-md bg-surface-2 text-fg-faint text-[10px]">
        <Info size={12} className="shrink-0 mt-px" />
        <span>
          O eixo é definido pela primeira <strong className="text-fg-muted">linha de construção</strong>{' '}
          (atalho <code className="font-mono">CL</code>) do esboço.
        </span>
      </div>

      <div className="pt-2 border-t border-edge text-[10px] text-fg-faint flex justify-between">
        <span>sketch:</span>
        <span className="font-mono text-fg-muted">{params.sketchId.slice(0, 8)}…</span>
      </div>
    </div>
  );
}

function QuickAngleButtons({ onPick }: { onPick: (a: number) => void }) {
  return (
    <div className="flex gap-1 pt-1">
      {[90, 180, 270, 360].map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onPick(a)}
          className="flex-1 py-1 text-[10px] rounded border border-edge bg-surface-2 hover:border-accent hover:text-accent transition-colors"
        >
          {a}°
        </button>
      ))}
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
      <span>Revolução gerada.</span>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-fg-faint font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
