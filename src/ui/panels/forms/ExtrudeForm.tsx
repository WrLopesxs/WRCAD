/**
 * src/ui/panels/forms/ExtrudeForm.tsx
 * Editor de feature Extrude. Inputs herdam estilo da classe .form-input (que
 * respeita tema dark/light automaticamente). Select também (estilizado em base).
 * Edição ao vivo: cada mudança chama updateFeature → cache invalida → regen.
 */
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ExtrudeParams, Feature } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface ExtrudeFormProps {
  feature: Feature;
}

const DIRECTIONS: { value: ExtrudeParams['direction']; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'reverse', label: 'Reverso' },
  { value: 'midplane', label: 'Meio plano' },
  { value: 'both', label: 'Ambos os lados' },
];

const END_CONDITIONS: { value: ExtrudeParams['endCondition']; label: string }[] = [
  { value: 'blind', label: 'Cego (distância)' },
  { value: 'through-all', label: 'Atravessa tudo' },
  { value: 'up-to-vertex', label: 'Até vértice' },
  { value: 'up-to-surface', label: 'Até superfície' },
];

const RIM_STYLES: { value: NonNullable<ExtrudeParams['rimStyle']>; label: string }[] = [
  { value: 'sharp', label: 'Canto vivo (sem suavização)' },
  { value: 'chamfer', label: 'Chanfro reto' },
  { value: 'fillet', label: 'Filete arredondado' },
];

export function ExtrudeForm({ feature }: ExtrudeFormProps) {
  const params = feature.parameters as unknown as ExtrudeParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const sketch = useDocumentStore((s) => s.doc.sketches[params.sketchId]);
  const diag = getEvalDiagnostic(feature.id);

  // No plano XY (chão), reverso = abaixo do grid. Removemos a opção.
  const allowedDirections =
    sketch?.plane === 'XY'
      ? DIRECTIONS.filter((d) => d.value !== 'reverse')
      : DIRECTIONS;

  // Se a feature já está em reverso e o plano é XY, força para normal
  if (sketch?.plane === 'XY' && params.direction === 'reverse') {
    setTimeout(() => {
      updateFeature(feature.id, {
        parameters: { ...params, direction: 'normal' } as unknown as Record<string, unknown>,
      });
    }, 0);
  }

  const update = (patch: Partial<ExtrudeParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && (
        <Diagnostic
          error={diag.error}
          loops={diag.loopsFound}
          holes={diag.holesFound}
          droppedCount={diag.droppedCount}
          droppedReasons={diag.droppedReasons}
        />
      )}

      <FieldGroup label="Distância (mm)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={500}
            step={0.5}
            value={params.distance}
            onChange={(e) => update({ distance: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={params.distance}
            onChange={(e) => update({ distance: parseFloat(e.target.value) || 0.1 })}
            className="form-input w-20 text-right"
          />
        </div>
      </FieldGroup>

      <FieldGroup
        label="Direção"
        hint={sketch?.plane === 'XY' ? '"Reverso" indisponível neste plano' : undefined}
      >
        <select
          value={params.direction}
          onChange={(e) =>
            update({ direction: e.target.value as ExtrudeParams['direction'] })
          }
          className="w-full"
        >
          {allowedDirections.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Condição final">
        <select
          value={params.endCondition}
          onChange={(e) =>
            update({ endCondition: e.target.value as ExtrudeParams['endCondition'] })
          }
          className="w-full"
        >
          {END_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value} disabled={c.value !== 'blind'}>
              {c.label}
              {c.value !== 'blind' ? ' — em breve' : ''}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Ângulo de saída (graus)" hint="0 = sem draft">
        <input
          type="number"
          min={-45}
          max={45}
          step={0.5}
          value={params.draftAngle ?? 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            update({ draftAngle: v === 0 ? undefined : v });
          }}
          className="form-input"
        />
      </FieldGroup>

      <FieldGroup label="Arestas (topo/base)">
        <select
          value={params.rimStyle ?? 'sharp'}
          onChange={(e) =>
            update({ rimStyle: e.target.value as ExtrudeParams['rimStyle'] })
          }
          className="w-full"
        >
          {RIM_STYLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </FieldGroup>

      {(params.rimStyle === 'chamfer' || params.rimStyle === 'fillet') && (
        <FieldGroup
          label={`Tamanho do ${params.rimStyle === 'chamfer' ? 'chanfro' : 'filete'} (mm)`}
          hint={`máx: ${(params.distance / 2).toFixed(1)} (metade da espessura)`}
        >
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.1}
              max={Math.max(0.1, params.distance / 2)}
              step={0.1}
              value={params.rimSize ?? 1}
              onChange={(e) => update({ rimSize: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={params.rimSize ?? 1}
              onChange={(e) => update({ rimSize: parseFloat(e.target.value) || 0.1 })}
              className="form-input w-20 text-right"
            />
          </div>
        </FieldGroup>
      )}

      <div className="pt-2 border-t border-edge text-[10px] text-fg-faint flex justify-between">
        <span>sketch:</span>
        <span className="font-mono text-fg-muted">{params.sketchId.slice(0, 8)}…</span>
      </div>
    </div>
  );
}

function Diagnostic({
  error,
  loops,
  holes,
  droppedCount,
  droppedReasons,
}: {
  error: string | null;
  loops?: number;
  holes?: number;
  droppedCount?: number;
  droppedReasons?: string[];
}) {
  if (error) {
    return (
      <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-[11px]">
        <AlertTriangle size={14} className="shrink-0 mt-px" />
        <span>{error}</span>
      </div>
    );
  }
  if (loops == null) return null;

  const holeText = holes && holes > 0 ? ` · ${holes} ${holes === 1 ? 'furo' : 'furos'}` : '';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-[11px]">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>1 contorno{holeText} detectado.</span>
      </div>
      {droppedCount != null && droppedCount > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px]">
          <Info size={14} className="shrink-0 mt-px" />
          <div className="flex-1 space-y-1">
            <div>
              {droppedCount} {droppedCount === 1 ? 'loop ignorado' : 'loops ignorados'}:
            </div>
            <ul className="list-disc list-inside space-y-0.5 opacity-90">
              {droppedReasons?.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="pt-1 opacity-75">
              Para casos complexos: faça extrudes separadas + Corte extrudado.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] uppercase tracking-wider text-fg-faint font-medium">
          {label}
        </label>
        {hint && <span className="text-[10px] text-fg-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
