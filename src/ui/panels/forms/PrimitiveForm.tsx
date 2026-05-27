/**
 * src/ui/panels/forms/PrimitiveForm.tsx
 * Editor de primitivas. Mostra controles diferentes por shape — só os campos
 * relevantes pra forma escolhida aparecem.
 *
 * Tudo é live: cada slider/input dispara updateFeature → re-evalúa → atualiza
 * o viewport em tempo real. Perfeito pra "modelar arrastando".
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { defaultPrimitiveParams } from '@/domain/features/Primitive';
import type { Feature, PrimitiveParams, PrimitiveShape } from '@/domain/types';
import { useDocumentStore } from '@/state/documentStore';
import { getEvalDiagnostic } from '@/engine/evaluator';

interface PrimitiveFormProps {
  feature: Feature;
}

const SHAPES: { value: PrimitiveShape; label: string; emoji: string }[] = [
  { value: 'box', label: 'Cubo', emoji: '⬛' },
  { value: 'cylinder', label: 'Cilindro', emoji: '⬭' },
  { value: 'sphere', label: 'Esfera', emoji: '⚪' },
  { value: 'cone', label: 'Cone', emoji: '🔺' },
  { value: 'torus', label: 'Toro', emoji: '⭕' },
];

/** Paleta de cores rápidas (estilo Tinkercad) */
const SWATCHES = [
  '#9ca3af', // neutro
  '#ef4444', // vermelho
  '#f97316', // laranja
  '#eab308', // amarelo
  '#22c55e', // verde
  '#06b6d4', // ciano
  '#3b82f6', // azul
  '#8b5cf6', // roxo
];

export function PrimitiveForm({ feature }: PrimitiveFormProps) {
  const params = feature.parameters as unknown as PrimitiveParams;
  const updateFeature = useDocumentStore((s) => s.updateFeature);
  const diag = getEvalDiagnostic(feature.id);

  const update = (patch: Partial<PrimitiveParams>) => {
    updateFeature(feature.id, {
      parameters: { ...params, ...patch } as unknown as Record<string, unknown>,
    });
  };

  const swapShape = (newShape: PrimitiveShape) => {
    // Ao trocar shape, mantém posição mas usa defaults da nova forma
    const def = defaultPrimitiveParams(newShape);
    updateFeature(feature.id, {
      parameters: {
        ...def,
        position: params.position,
        rotationY: params.rotationY,
      } as unknown as Record<string, unknown>,
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

      <FieldGroup label="Forma">
        <div className="grid grid-cols-5 gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => swapShape(s.value)}
              title={s.label}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded border transition-colors ${
                params.shape === s.value
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface-2 border-edge text-fg-muted hover:border-edge-strong'
              }`}
            >
              <span className="text-base leading-none">{s.emoji}</span>
              <span className="text-[9px]">{s.label}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Cor">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={params.color ?? '#9ca3af'}
            onChange={(e) => update({ color: e.target.value })}
            className="w-12 h-8 cursor-pointer"
          />
          <input
            type="text"
            value={params.color ?? '#9ca3af'}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#[0-9a-fA-F]{6}$/.test(v)) update({ color: v });
            }}
            className="form-input flex-1 font-mono"
            placeholder="#9ca3af"
            maxLength={7}
          />
        </div>
        <div className="flex gap-1 pt-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update({ color: c })}
              className={`flex-1 h-5 rounded border transition-transform hover:scale-110 ${
                params.color === c ? 'border-accent ring-1 ring-accent' : 'border-edge'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </FieldGroup>

      {/* Dimensões variam por shape */}
      {params.shape === 'box' && (
        <>
          <DimSlider label="Largura (X)" value={params.width ?? 20} max={200} onChange={(v) => update({ width: v })} />
          <DimSlider label="Altura (Y)" value={params.height ?? 20} max={200} onChange={(v) => update({ height: v })} />
          <DimSlider label="Profundidade (Z)" value={params.depth ?? 20} max={200} onChange={(v) => update({ depth: v })} />
        </>
      )}

      {params.shape === 'cylinder' && (
        <>
          <DimSlider label="Raio" value={params.radius ?? 10} max={100} onChange={(v) => update({ radius: v })} />
          <DimSlider label="Altura" value={params.height ?? 20} max={200} onChange={(v) => update({ height: v })} />
        </>
      )}

      {params.shape === 'sphere' && (
        <DimSlider label="Raio" value={params.radius ?? 15} max={100} onChange={(v) => update({ radius: v })} />
      )}

      {params.shape === 'cone' && (
        <>
          <DimSlider label="Raio base" value={params.radius ?? 10} max={100} onChange={(v) => update({ radius: v })} />
          <DimSlider
            label="Raio topo (0 = ponta)"
            value={params.radiusTop ?? 0}
            max={params.radius ?? 100}
            min={0}
            onChange={(v) => update({ radiusTop: v })}
          />
          <DimSlider label="Altura" value={params.height ?? 20} max={200} onChange={(v) => update({ height: v })} />
        </>
      )}

      {params.shape === 'torus' && (
        <>
          <DimSlider label="Raio principal" value={params.radius ?? 15} max={100} onChange={(v) => update({ radius: v })} />
          <DimSlider
            label="Raio do tubo"
            value={params.tubeRadius ?? 4}
            max={Math.max(1, (params.radius ?? 15) - 0.1)}
            min={0.5}
            onChange={(v) => update({ tubeRadius: v })}
          />
        </>
      )}

      <FieldGroup label="Rotação em Y (graus)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={params.rotationY ?? 0}
            onChange={(e) => update({ rotationY: parseFloat(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            step={1}
            value={params.rotationY ?? 0}
            onChange={(e) => update({ rotationY: parseFloat(e.target.value) || 0 })}
            className="form-input w-16 text-right"
          />
        </div>
      </FieldGroup>

      <FieldGroup label="Posição da base (mm)">
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

interface DimSliderProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
}

function DimSlider({ label, value, min = 0.5, max, onChange }: DimSliderProps) {
  return (
    <FieldGroup label={`${label} (mm)`}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <input
          type="number"
          min={min}
          step={0.5}
          value={value}
          onChange={(e) =>
            onChange(Math.max(min, parseFloat(e.target.value) || min))
          }
          className="form-input w-20 text-right"
        />
      </div>
    </FieldGroup>
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
      <span>Primitiva adicionada.</span>
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
