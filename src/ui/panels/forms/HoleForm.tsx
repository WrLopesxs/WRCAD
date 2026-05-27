/**
 * src/ui/panels/forms/HoleForm.tsx
 * Editor de furo. Mostra campos diferentes conforme o tipo:
 *   - through:     só diâmetro (profundidade é automática)
 *   - blind:       diâmetro + profundidade
 *   - counterbore: + diâmetro/profundidade do rebaixo
 *   - countersink: + diâmetro/profundidade do escareado (cone)
 *
 * Posição XYZ no mundo e direção (eixo) sempre visíveis.
 */
import { AlertTriangle, CheckCircle2, Circle as CircleIcon, Disc, Triangle } from 'lucide-react';
import type { Feature, HoleParams } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface HoleFormProps {
  feature: Feature;
}

const TYPES: {
  value: HoleParams['type'];
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  { value: 'through', label: 'Passante', hint: 'atravessa qualquer espessura', icon: <CircleIcon size={14} /> },
  { value: 'blind', label: 'Cego', hint: 'profundidade definida', icon: <Disc size={14} /> },
  { value: 'counterbore', label: 'Rebaixado', hint: 'cilindro + alargamento (parafusos cilíndricos)', icon: <Disc size={14} /> },
  { value: 'countersink', label: 'Escareado', hint: 'cilindro + cone (parafusos avelanados)', icon: <Triangle size={14} /> },
];

const AXES: { value: HoleParams['axis']; label: string }[] = [
  { value: '-Y', label: '↓ topo' },
  { value: 'Y', label: '↑ baixo' },
  { value: '-X', label: '→ esq' },
  { value: 'X', label: '← dir' },
  { value: '-Z', label: '⤴ frente' },
  { value: 'Z', label: '⤵ trás' },
];

export function HoleForm({ feature }: HoleFormProps) {
  const params = feature.parameters as unknown as HoleParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<HoleParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  const updatePos = (i: 0 | 1 | 2, v: number) => {
    const pos: [number, number, number] = [...params.position];
    pos[i] = v;
    update({ position: pos });
  };

  return (
    <div className="space-y-3 text-xs">
      {diag && <Diagnostic error={diag.error} />}

      <FieldGroup label="Tipo">
        <div className="space-y-1">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                params.type === t.value
                  ? 'bg-accent/15 text-fg'
                  : 'hover:bg-surface-3 text-fg-muted'
              }`}
            >
              <input
                type="radio"
                name="hole-type"
                checked={params.type === t.value}
                onChange={() => update({ type: t.value })}
                className="mt-0.5"
              />
              <span className="mt-0.5 text-fg-muted">{t.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{t.label}</div>
                <div className="text-[10px] text-fg-faint">{t.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Direção (por onde o furo entra)">
        <select
          value={params.axis}
          onChange={(e) => update({ axis: e.target.value as HoleParams['axis'] })}
          className="w-full"
        >
          {AXES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label} ({a.value})
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Diâmetro principal (mm)">
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={params.diameter}
          onChange={(e) =>
            update({ diameter: Math.max(0.5, parseFloat(e.target.value) || 0.5) })
          }
          className="form-input"
        />
      </FieldGroup>

      {params.type !== 'through' && (
        <FieldGroup label="Profundidade (mm)">
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={params.depth}
            onChange={(e) =>
              update({ depth: Math.max(0.5, parseFloat(e.target.value) || 0.5) })
            }
            className="form-input"
          />
        </FieldGroup>
      )}

      {(params.type === 'counterbore' || params.type === 'countersink') && (
        <>
          <FieldGroup
            label={
              params.type === 'counterbore'
                ? 'Diâmetro do rebaixo (mm)'
                : 'Diâmetro do escareado (mm)'
            }
          >
            <input
              type="number"
              min={params.diameter + 0.1}
              step={0.5}
              value={params.headDiameter ?? params.diameter * 1.8}
              onChange={(e) =>
                update({
                  headDiameter: Math.max(
                    params.diameter + 0.1,
                    parseFloat(e.target.value) || params.diameter * 1.8,
                  ),
                })
              }
              className="form-input"
            />
          </FieldGroup>
          <FieldGroup
            label={
              params.type === 'counterbore'
                ? 'Profundidade do rebaixo (mm)'
                : 'Profundidade do escareado (mm)'
            }
          >
            <input
              type="number"
              min={0.1}
              step={0.2}
              value={params.headDepth ?? 3}
              onChange={(e) =>
                update({ headDepth: Math.max(0.1, parseFloat(e.target.value) || 3) })
              }
              className="form-input"
            />
          </FieldGroup>
        </>
      )}

      <FieldGroup label="Posição do centro do topo (mm)">
        <div className="grid grid-cols-3 gap-1.5">
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="block text-[10px] text-fg-faint mb-0.5">{axis}</span>
              <input
                type="number"
                step={1}
                value={params.position[i as 0 | 1 | 2]}
                onChange={(e) => updatePos(i as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
                className="form-input w-full text-right"
              />
            </label>
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
      <span>Furo aplicado.</span>
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
