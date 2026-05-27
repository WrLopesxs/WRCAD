# WRCAD — Especificação Técnica Completa

> **Para o Claude do VS Code:** este arquivo é a especificação-mestra do projeto. Use-o como contexto sempre que implementar qualquer feature do WRCAD. Cada seção explica **o que construir**, **como organizar** e **qual lógica replicar** dos 3 softwares de referência (AutoCAD, SolidWorks, CATIA).

**Stack alvo:** React 18+ • TypeScript • Three.js • react-three-fiber • @react-three/drei • Zustand (state) • Tailwind CSS • Vite

**Autor do projeto:** WR Solution (Wender Lopes)
**Objetivo:** CAD/visualizador 3D paramétrico rodando no navegador, inspirado nos melhores conceitos dos 3 maiores CADs do mundo.

---

## 0. Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP REACT (UI)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TitleBar  │  Ribbon (abas: Sketch / Modeling / View)    │  │
│  ├────────┬─────────────────────────────────────┬───────────┤  │
│  │        │                                     │           │  │
│  │ Feature│                                     │ Properties│  │
│  │ Tree   │       3D Viewport (R3F Canvas)      │ Panel     │  │
│  │ +      │                                     │           │  │
│  │ Layers │                                     │           │  │
│  ├────────┴─────────────────────────────────────┴───────────┤  │
│  │              Command Line + Status Bar (snaps, units)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │                          │
              ▼                          ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│  STATE (Zustand stores)  │   │  GEOMETRY ENGINE            │
│  - documentStore         │   │  - Three.js primitives      │
│  - sketchStore           │   │  - Constraint solver (2D)   │
│  - selectionStore        │   │  - Feature evaluator        │
│  - uiStore (ribbon, etc) │   │  - (Opcional) OpenCascade   │
└──────────────────────────┘   └─────────────────────────────┘
```

**Princípio número 1:** separar **estado lógico do modelo** (features, sketches, layers, mates) da **representação visual** (meshes, materiais, edges). O viewport é uma projeção do estado; nunca o contrário.

---

## 1. Bibliotecas (dependências mínimas a instalar)

```bash
# 3D
npm install three @react-three/fiber @react-three/drei

# Estado
npm install zustand

# UI
npm install -D tailwindcss@latest postcss autoprefixer
npm install lucide-react phosphor-react           # ícones
npm install @radix-ui/react-tabs @radix-ui/react-dropdown-menu  # primitivas acessíveis

# Utilidades CAD
npm install gl-matrix                  # mat4, vec3 otimizados
npm install nanoid                      # IDs únicos para features
npm install dxf-parser dxf-writer       # importar/exportar DXF (AutoCAD)
npm install three-mesh-bvh              # raycasting rápido para snap

# Opcional (kernel CAD real, B-Rep paramétrico)
npm install opencascade.js              # WASM ~30MB, mas dá boolean/fillet/loft de verdade

# Dev
npm install -D typescript @types/three @types/react
```

**Recomendação:** comece sem o `opencascade.js`. Modele em mesh + CSG simples (`three-bvh-csg` ou `three-csg-ts`) até precisar de fillets/superfícies de qualidade. Quando precisar, ative o kernel WASM.

---

## 2. Estrutura de pastas

```
src/
├── app/
│   ├── App.tsx                    # shell raiz
│   ├── Layout.tsx                 # grid principal
│   └── routes.tsx
├── ui/
│   ├── ribbon/
│   │   ├── Ribbon.tsx             # faixa superior
│   │   ├── tabs/                  # cada aba é um arquivo
│   │   │   ├── HomeTab.tsx
│   │   │   ├── SketchTab.tsx
│   │   │   ├── ModelingTab.tsx
│   │   │   ├── AssemblyTab.tsx
│   │   │   ├── AnnotateTab.tsx
│   │   │   └── ViewTab.tsx
│   │   └── RibbonButton.tsx
│   ├── trees/
│   │   ├── FeatureTree.tsx        # árvore de features (SolidWorks-like)
│   │   ├── LayerPanel.tsx         # camadas (AutoCAD-like)
│   │   └── TreeNode.tsx
│   ├── panels/
│   │   ├── PropertiesPanel.tsx    # painel direito de propriedades
│   │   ├── ToolPalette.tsx        # paleta flutuante (blocos, materiais)
│   │   └── CommandLine.tsx        # linha de comando inferior
│   ├── statusbar/
│   │   ├── StatusBar.tsx
│   │   └── SnapToggles.tsx
│   └── viewport/
│       ├── Viewport.tsx           # Canvas do R3F
│       ├── ViewCube.tsx
│       ├── Grid.tsx
│       ├── Gizmos.tsx
│       └── SelectionOverlay.tsx
├── domain/
│   ├── types.ts                   # tipos de dados centrais
│   ├── features/
│   │   ├── Sketch.ts
│   │   ├── Extrude.ts
│   │   ├── Revolve.ts
│   │   ├── Sweep.ts
│   │   ├── Loft.ts
│   │   ├── Fillet.ts
│   │   ├── Chamfer.ts
│   │   ├── Shell.ts
│   │   ├── Pattern.ts
│   │   ├── Mirror.ts
│   │   └── BooleanOp.ts
│   ├── constraints/
│   │   ├── ConstraintSolver.ts    # solver 2D
│   │   └── constraints.ts         # tipos: coincident, parallel, perpendicular...
│   ├── assembly/
│   │   ├── Mate.ts                # concentric, coincident, distance, angle...
│   │   └── AssemblyTree.ts
│   └── annotation/
│       ├── Dimension.ts
│       └── Note.ts
├── engine/
│   ├── geometry/
│   │   ├── primitives.ts          # box, cylinder, sphere, plane
│   │   ├── operations.ts          # extrude, revolve, sweep, loft
│   │   ├── boolean.ts             # union, subtract, intersect
│   │   └── transform.ts           # translate, rotate, scale, mirror
│   ├── evaluator.ts               # roda a árvore de features e gera meshes
│   ├── snap.ts                    # endpoint, midpoint, center, perpendicular, tangent
│   ├── raycaster.ts               # picking 3D
│   └── exporters/
│       ├── stl.ts
│       ├── obj.ts
│       ├── dxf.ts
│       └── step.ts                # via opencascade.js
├── state/
│   ├── documentStore.ts           # árvore de features, layers, etc
│   ├── sketchStore.ts             # esboço ativo
│   ├── selectionStore.ts
│   ├── uiStore.ts                 # ribbon ativo, tema, painéis abertos
│   └── commandStore.ts            # histórico de comandos (undo/redo)
├── commands/
│   ├── registry.ts                # mapa nome → função (igual ao AutoCAD pgp)
│   ├── parser.ts                  # parser da linha de comando
│   └── aliases.ts                 # L=LINE, C=CIRCLE...
├── utils/
│   ├── math.ts                    # helpers de matemática 3D
│   ├── ids.ts
│   └── persist.ts                 # save/load JSON do projeto
└── styles/
    └── tailwind.css
```

---

## 3. Tipos de dados centrais (`src/domain/types.ts`)

Estes tipos são o **núcleo** do sistema. Tudo gira em torno deles. Implemente aqui primeiro.

```typescript
// ===== Identificadores =====
export type ID = string;            // nanoid()

// ===== Vetores e matrizes =====
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Mat4 = [number, number, number, number,
                    number, number, number, number,
                    number, number, number, number,
                    number, number, number, number];

// ===== Planos de referência (SolidWorks/CATIA-like) =====
export type RefPlane = 'XY' | 'YZ' | 'XZ' | ID; // ou plano customizado

// ===== Camadas (AutoCAD-like) =====
export interface Layer {
  id: ID;
  name: string;                     // ex: "Estrutura", "Cotagem", "Auxiliar"
  color: string;                    // "#RRGGBB"
  lineType: 'continuous' | 'dashed' | 'hidden' | 'center' | 'phantom';
  lineWeight: number;               // mm
  visible: boolean;
  locked: boolean;
  plot: boolean;                    // imprime ou não
}

// ===== Esboço 2D (SolidWorks-like) =====
export interface SketchEntity {
  id: ID;
  type: 'line' | 'circle' | 'arc' | 'rect' | 'spline' | 'point';
  points: Vec2[];                   // pontos definidores no espaço local do plano
  construction: boolean;            // linha de construção?
  layerId: ID;
}

export type ConstraintType =
  | 'coincident' | 'horizontal' | 'vertical' | 'parallel'
  | 'perpendicular' | 'tangent' | 'concentric' | 'equal'
  | 'fix' | 'midpoint' | 'symmetric' | 'distance' | 'angle' | 'radius';

export interface Constraint {
  id: ID;
  type: ConstraintType;
  entities: ID[];                   // a quem se aplica
  value?: number;                   // para distance/angle/radius
}

export interface Sketch {
  id: ID;
  name: string;
  plane: RefPlane;
  entities: SketchEntity[];
  constraints: Constraint[];
  fullyConstrained: boolean;        // calculado pelo solver
}

// ===== Feature (operação na árvore — SolidWorks/CATIA) =====
export type FeatureType =
  | 'sketch'
  | 'extrude' | 'revolve' | 'sweep' | 'loft'
  | 'cut-extrude' | 'cut-revolve' | 'cut-sweep' | 'cut-loft'
  | 'fillet' | 'chamfer' | 'shell' | 'draft' | 'rib'
  | 'hole' | 'thread'
  | 'pattern-linear' | 'pattern-circular' | 'mirror'
  | 'boolean-union' | 'boolean-subtract' | 'boolean-intersect'
  | 'imported';                     // STEP/STL/etc

export interface Feature {
  id: ID;
  type: FeatureType;
  name: string;                     // editável pelo usuário
  parameters: Record<string, any>;  // depende do tipo
  inputs: ID[];                     // sketches ou outras features que alimentam
  suppressed: boolean;              // SolidWorks: oculta da regeneração
  errored: boolean;                 // falhou ao regenerar
  layerId?: ID;                     // opcional, para color override
  visible: boolean;
}

// Exemplos de parameters por tipo:
// extrude:  { sketchId, distance, direction: 'normal'|'reverse'|'both', draft?: number }
// revolve:  { sketchId, axisId, angle, direction }
// fillet:   { edges: ID[], radius, variableRadius?: [...] }
// pattern-linear: { featureIds: ID[], direction: Vec3, count, spacing }

// ===== Documento (peça/montagem) — Equivalente a .sldprt / .CATPart =====
export interface Document {
  id: ID;
  name: string;
  kind: 'part' | 'assembly' | 'drawing';
  units: 'mm' | 'cm' | 'm' | 'in';
  features: Feature[];              // ordem importa (cronológica)
  sketches: Record<ID, Sketch>;
  layers: Layer[];
  components?: AssemblyComponent[]; // se kind === 'assembly'
  mates?: Mate[];                   // se kind === 'assembly'
  blocks?: Block[];                 // AutoCAD-like
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    revision: string;
  };
}

// ===== Blocos (AutoCAD-like) =====
export interface Block {
  id: ID;
  name: string;
  entities: SketchEntity[];         // o que está dentro do bloco
  attributes: BlockAttribute[];     // campos editáveis por instância
  insertionPoint: Vec3;
}

export interface BlockAttribute {
  tag: string;                      // ex: "REF", "QTY"
  defaultValue: string;
  promptText: string;
}

export interface BlockInstance {
  id: ID;
  blockId: ID;
  position: Vec3;
  rotation: number;
  scale: Vec3;
  attributeValues: Record<string, string>;
  layerId: ID;
}

// ===== Montagem (SolidWorks/CATIA-like) =====
export interface AssemblyComponent {
  id: ID;
  documentRef: ID;                  // qual documento (.part) representa
  position: Vec3;
  rotation: Vec3;                   // Euler XYZ
  fixed: boolean;                   // primeira peça é fixa por padrão
  visible: boolean;
}

export type MateType =
  | 'coincident' | 'parallel' | 'perpendicular' | 'tangent'
  | 'concentric' | 'lock' | 'distance' | 'angle'
  // mecânicos:
  | 'gear' | 'rack-pinion' | 'screw' | 'cam' | 'hinge' | 'slot';

export interface Mate {
  id: ID;
  type: MateType;
  components: [ID, ID];
  entities: [string, string];       // faceId, edgeId, etc
  parameters?: Record<string, any>;
}

// ===== Anotação (cotagem) =====
export interface Dimension {
  id: ID;
  type: 'linear' | 'aligned' | 'angular' | 'radius' | 'diameter' | 'arclength';
  entities: ID[];
  value: number;                    // calculado
  override?: string;                // texto custom
  position: Vec3;                   // onde aparece
  layerId: ID;
}
```

---

## 4. Estado global (Zustand)

A regra de ouro: **um store por domínio**. Não enfie tudo num só.

### 4.1 `documentStore` — o coração do app

```typescript
// src/state/documentStore.ts
import { create } from 'zustand';
import { temporal } from 'zundo'; // para undo/redo automático
import type { Document, Feature, Sketch, Layer, ID } from '@/domain/types';

interface DocumentState {
  doc: Document;

  // mutações de features
  addFeature: (feature: Feature) => void;
  updateFeature: (id: ID, patch: Partial<Feature>) => void;
  removeFeature: (id: ID) => void;
  reorderFeature: (id: ID, newIndex: number) => void;
  suppressFeature: (id: ID, suppress: boolean) => void;
  renameFeature: (id: ID, name: string) => void;

  // sketches
  addSketch: (sketch: Sketch) => void;
  updateSketch: (id: ID, patch: Partial<Sketch>) => void;

  // layers
  addLayer: (layer: Layer) => void;
  updateLayer: (id: ID, patch: Partial<Layer>) => void;
  removeLayer: (id: ID) => void;
  setActiveLayer: (id: ID) => void;
  activeLayerId: ID;

  // ciclo de vida
  newDocument: (kind: Document['kind']) => void;
  loadDocument: (doc: Document) => void;
  saveAsJSON: () => string;
}

export const useDocumentStore = create<DocumentState>()(
  temporal((set, get) => ({
    doc: createEmptyDocument(),
    activeLayerId: 'default',

    addFeature: (f) => set((s) => ({
      doc: { ...s.doc, features: [...s.doc.features, f] }
    })),
    // ... etc
  }))
);

// hook para undo/redo
export const useDocumentHistory = () => useDocumentStore.temporal.getState();
```

### 4.2 Outros stores

```typescript
// uiStore — qual aba ribbon ativa, painéis abertos, tema, snaps
interface UIState {
  ribbonTab: 'home' | 'sketch' | 'modeling' | 'assembly' | 'annotate' | 'view';
  panels: {
    featureTree: boolean;
    properties: boolean;
    commandLine: boolean;
    layers: boolean;
  };
  snaps: {
    endpoint: boolean;
    midpoint: boolean;
    center: boolean;
    intersection: boolean;
    perpendicular: boolean;
    tangent: boolean;
    nearest: boolean;
    grid: boolean;
    ortho: boolean;
    polar: boolean;
  };
  theme: 'dark' | 'light';
  viewStyle: 'wireframe' | 'shaded' | 'shaded-edges' | 'hidden' | 'realistic';
}

// selectionStore — o que está selecionado no viewport / árvore
interface SelectionState {
  selectedIds: ID[];
  hovered: ID | null;
  selectionMode: 'face' | 'edge' | 'vertex' | 'body' | 'feature';
  select: (ids: ID[]) => void;
  toggleSelect: (id: ID) => void;
  clear: () => void;
}

// commandStore — linha de comando + histórico
interface CommandState {
  current: string;                  // o que está sendo digitado
  history: string[];                // últimos comandos
  prompt: string;                   // "Select first point:"
  args: any[];                      // argumentos coletados
  activeCommand: string | null;     // 'LINE', 'CIRCLE', etc
  execute: (cmdLine: string) => void;
}
```

---

## 5. UI — Componentes principais

### 5.1 Ribbon (faixa superior — inspirada em AutoCAD/SolidWorks/CATIA)

**Conceito absorvido:**
- Do **AutoCAD**: ribbon com abas contextuais, painéis agrupados por função, atalhos rápidos
- Do **SolidWorks**: CommandManager que muda conforme o ambiente (Sketch ↔ Part ↔ Assembly)
- Do **CATIA**: workbenches que reconfiguram totalmente a UI ao mudar de contexto

**Implementação:**

```tsx
// src/ui/ribbon/Ribbon.tsx
import * as Tabs from '@radix-ui/react-tabs';
import { useUIStore } from '@/state/uiStore';
import { HomeTab, SketchTab, ModelingTab, AssemblyTab, AnnotateTab, ViewTab } from './tabs';

export function Ribbon() {
  const { ribbonTab, setRibbonTab } = useUIStore();
  return (
    <Tabs.Root value={ribbonTab} onValueChange={setRibbonTab as any}>
      <Tabs.List className="flex border-b border-neutral-800 bg-neutral-900">
        <RibbonTabTrigger value="home">Início</RibbonTabTrigger>
        <RibbonTabTrigger value="sketch">Esboço</RibbonTabTrigger>
        <RibbonTabTrigger value="modeling">Modelagem</RibbonTabTrigger>
        <RibbonTabTrigger value="assembly">Montagem</RibbonTabTrigger>
        <RibbonTabTrigger value="annotate">Anotação</RibbonTabTrigger>
        <RibbonTabTrigger value="view">Visualização</RibbonTabTrigger>
      </Tabs.List>
      <Tabs.Content value="home"><HomeTab /></Tabs.Content>
      <Tabs.Content value="sketch"><SketchTab /></Tabs.Content>
      <Tabs.Content value="modeling"><ModelingTab /></Tabs.Content>
      <Tabs.Content value="assembly"><AssemblyTab /></Tabs.Content>
      <Tabs.Content value="annotate"><AnnotateTab /></Tabs.Content>
      <Tabs.Content value="view"><ViewTab /></Tabs.Content>
    </Tabs.Root>
  );
}
```

**Estrutura de cada aba — painéis agrupados:**

```tsx
// src/ui/ribbon/tabs/SketchTab.tsx
import { RibbonPanel, RibbonButton } from '../components';
import {
  PenLine, Circle, Square, MoveDiagonal, Spline, RotateCcw,
  Scissors, Copy, FlipHorizontal2, Ruler
} from 'lucide-react';
import { useCommandStore } from '@/state/commandStore';

export function SketchTab() {
  const exec = useCommandStore((s) => s.execute);
  return (
    <div className="flex gap-2 p-2 bg-neutral-950">
      <RibbonPanel title="Desenhar">
        <RibbonButton icon={<PenLine />} label="Linha"      onClick={() => exec('LINE')}      shortcut="L" />
        <RibbonButton icon={<Circle />}  label="Círculo"    onClick={() => exec('CIRCLE')}    shortcut="C" />
        <RibbonButton icon={<Square />}  label="Retângulo"  onClick={() => exec('RECTANG')}   shortcut="REC" />
        <RibbonButton icon={<MoveDiagonal />} label="Arco"  onClick={() => exec('ARC')}       shortcut="A" />
        <RibbonButton icon={<Spline />}  label="Spline"     onClick={() => exec('SPLINE')}    shortcut="SPL" />
      </RibbonPanel>

      <RibbonPanel title="Modificar">
        <RibbonButton icon={<Scissors />}        label="Aparar"  onClick={() => exec('TRIM')}   shortcut="TR" />
        <RibbonButton icon={<Copy />}            label="Copiar"  onClick={() => exec('COPY')}   shortcut="CO" />
        <RibbonButton icon={<FlipHorizontal2/>}  label="Espelhar" onClick={() => exec('MIRROR')} shortcut="MI" />
        <RibbonButton icon={<RotateCcw />}       label="Girar"   onClick={() => exec('ROTATE')} shortcut="RO" />
      </RibbonPanel>

      <RibbonPanel title="Restrições">
        <RibbonButton icon={<Ruler />} label="Cota inteligente" onClick={() => exec('DIMENSION')} shortcut="DI" />
        {/* coincident, parallel, perpendicular, tangent, concentric, equal, fix */}
      </RibbonPanel>

      <RibbonPanel title="Sair do esboço">
        <RibbonButton label="Concluir esboço" onClick={() => exec('FINISH-SKETCH')} primary />
      </RibbonPanel>
    </div>
  );
}
```

**Botão padrão do ribbon (estrutura):**

```tsx
// src/ui/ribbon/RibbonButton.tsx
interface Props {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}
export function RibbonButton({ icon, label, shortcut, onClick, primary, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`
        flex flex-col items-center gap-1 px-3 py-2 rounded
        ${primary ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'hover:bg-neutral-800 text-neutral-200'}
        disabled:opacity-50 transition
      `}
    >
      {icon && <span className="w-6 h-6">{icon}</span>}
      <span className="text-xs">{label}</span>
    </button>
  );
}
```

---

### 5.2 Feature Tree (árvore de features — SolidWorks/CATIA)

**Conceito absorvido:**
- Do **SolidWorks**: árvore cronológica, suprimir/desuprimir, renomear, reordenar com drag-drop
- Do **CATIA**: Specification Tree com agrupamento por Geometrical Sets, ícones diferentes por tipo
- Mostra esboços aninhados dentro das features que os consomem

```tsx
// src/ui/trees/FeatureTree.tsx
import { useDocumentStore } from '@/state/documentStore';
import { useSelectionStore } from '@/state/selectionStore';
import { TreeNode } from './TreeNode';
import { EyeOff, Eye, Trash2, Edit3 } from 'lucide-react';

export function FeatureTree() {
  const features = useDocumentStore((s) => s.doc.features);
  const { selectedIds, select } = useSelectionStore();

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
      <header className="p-2 text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-800">
        Árvore de Recursos
      </header>
      <ul>
        <TreeRootItem icon="📐" label="Origem (planos XY, YZ, XZ)" />
        {features.map((f, idx) => (
          <TreeNode
            key={f.id}
            feature={f}
            selected={selectedIds.includes(f.id)}
            onSelect={() => select([f.id])}
          />
        ))}
      </ul>
    </aside>
  );
}
```

**Cada nó tem:**
- ícone por tipo (extrude, fillet, sketch...)
- nome editável (duplo clique)
- olho de visibilidade
- indicador de erro (vermelho) ou supressão (cinza riscado)
- menu de contexto: Editar, Suprimir, Excluir, Renomear, Rolar até aqui (rollback)

---

### 5.3 Layer Panel (camadas — AutoCAD)

**Conceito absorvido do AutoCAD:** organizar entidades por layers com cor/lineweight/visibilidade/lock.

```tsx
// src/ui/trees/LayerPanel.tsx
import { useDocumentStore } from '@/state/documentStore';
import { Eye, EyeOff, Lock, Unlock, Printer, PrinterOff } from 'lucide-react';

export function LayerPanel() {
  const { doc, activeLayerId, setActiveLayer, updateLayer, addLayer } = useDocumentStore();
  return (
    <div className="p-2">
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">Camadas</h3>
        <button onClick={() => addLayer(newLayer())} className="text-xs">+ Nova</button>
      </header>
      <table className="w-full text-xs">
        <thead className="text-neutral-400">
          <tr><th>Ativa</th><th>Nome</th><th>Cor</th><th>👁</th><th>🔒</th><th>🖨</th></tr>
        </thead>
        <tbody>
          {doc.layers.map((l) => (
            <tr key={l.id} className={activeLayerId === l.id ? 'bg-yellow-900/30' : ''}>
              <td><input type="radio" checked={activeLayerId === l.id} onChange={() => setActiveLayer(l.id)} /></td>
              <td>{l.name}</td>
              <td>
                <input type="color" value={l.color} onChange={(e) => updateLayer(l.id, { color: e.target.value })} />
              </td>
              <td><button onClick={() => updateLayer(l.id, { visible: !l.visible })}>{l.visible ? <Eye/> : <EyeOff/>}</button></td>
              <td><button onClick={() => updateLayer(l.id, { locked: !l.locked })}>{l.locked ? <Lock/> : <Unlock/>}</button></td>
              <td><button onClick={() => updateLayer(l.id, { plot: !l.plot })}>{l.plot ? <Printer/> : <PrinterOff/>}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 5.4 Properties Panel (lateral direita)

Equivalente ao **PropertyManager** do SolidWorks: quando uma feature ou comando está ativo, exibe seus parâmetros editáveis.

```tsx
// src/ui/panels/PropertiesPanel.tsx
import { useSelectionStore } from '@/state/selectionStore';
import { useDocumentStore } from '@/state/documentStore';
import { ExtrudeProperties, FilletProperties, SketchProperties } from './features';

export function PropertiesPanel() {
  const sel = useSelectionStore((s) => s.selectedIds);
  const feature = useDocumentStore((s) =>
    s.doc.features.find((f) => sel.includes(f.id))
  );
  if (!feature) return <EmptyState />;

  // dispatch por tipo
  switch (feature.type) {
    case 'extrude': return <ExtrudeProperties feature={feature} />;
    case 'fillet':  return <FilletProperties feature={feature} />;
    case 'sketch':  return <SketchProperties feature={feature} />;
    // ...
  }
}
```

Cada componente específico (ex: `ExtrudeProperties`) controla seus campos (sketch, distância, direção, ângulo de saída) e chama `updateFeature(id, { parameters: ... })`.

---

### 5.5 Command Line (linha de comando — AutoCAD)

**Coração da operação do AutoCAD.** Implementar isso bem é um dos maiores ganhos de produtividade.

```tsx
// src/ui/panels/CommandLine.tsx
import { useState, useEffect, useRef } from 'react';
import { useCommandStore } from '@/state/commandStore';

export function CommandLine() {
  const { current, prompt, history, execute, setCurrent } = useCommandStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // global hotkey: foco sempre disponível
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="bg-black border-t border-neutral-800 p-2 font-mono text-sm">
      <div className="max-h-32 overflow-y-auto text-neutral-400">
        {history.map((h, i) => <div key={i}>{h}</div>)}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-yellow-500">{prompt || 'Comando:'}</span>
        <input
          ref={inputRef}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') execute(current);
            if (e.key === 'Escape') execute('CANCEL');
            if (e.key === ' ' && current) { e.preventDefault(); execute(current); }
          }}
          className="flex-1 bg-transparent outline-none text-white"
        />
      </div>
    </div>
  );
}
```

---

### 5.6 Status Bar (rodapé — AutoCAD)

```tsx
// src/ui/statusbar/StatusBar.tsx
import { useUIStore } from '@/state/uiStore';

export function StatusBar() {
  const { snaps, toggleSnap } = useUIStore();
  return (
    <div className="flex items-center gap-3 px-3 py-1 bg-neutral-900 border-t border-neutral-800 text-xs">
      <ToggleChip active={snaps.endpoint}      onClick={() => toggleSnap('endpoint')}>END</ToggleChip>
      <ToggleChip active={snaps.midpoint}      onClick={() => toggleSnap('midpoint')}>MID</ToggleChip>
      <ToggleChip active={snaps.center}        onClick={() => toggleSnap('center')}>CEN</ToggleChip>
      <ToggleChip active={snaps.intersection}  onClick={() => toggleSnap('intersection')}>INT</ToggleChip>
      <ToggleChip active={snaps.perpendicular} onClick={() => toggleSnap('perpendicular')}>PER</ToggleChip>
      <ToggleChip active={snaps.tangent}       onClick={() => toggleSnap('tangent')}>TAN</ToggleChip>
      <ToggleChip active={snaps.grid}          onClick={() => toggleSnap('grid')}>GRID</ToggleChip>
      <ToggleChip active={snaps.ortho}         onClick={() => toggleSnap('ortho')}>ORTHO</ToggleChip>
      <ToggleChip active={snaps.polar}         onClick={() => toggleSnap('polar')}>POLAR</ToggleChip>
      <span className="ml-auto text-neutral-400">Unidades: mm</span>
    </div>
  );
}
```

---

### 5.7 Viewport 3D (R3F)

```tsx
// src/ui/viewport/Viewport.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewcube, Grid } from '@react-three/drei';
import { useDocumentStore } from '@/state/documentStore';
import { SceneFromFeatures } from './SceneFromFeatures';

export function Viewport() {
  return (
    <Canvas camera={{ position: [100, 100, 100], fov: 45, near: 0.1, far: 10000 }} shadows>
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={1} castShadow />

      <Grid args={[1000, 1000]} cellSize={10} sectionSize={100} fadeDistance={500} infiniteGrid />

      <SceneFromFeatures />

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube /* faces clicáveis para mudar de vista */ />
      </GizmoHelper>
    </Canvas>
  );
}
```

`SceneFromFeatures` itera sobre `doc.features`, chama o evaluator e renderiza os meshes resultantes.

---

## 6. Funções de desenho/modelagem — A LISTA MESTRA

Esta é a parte mais importante. Cada item abaixo é uma **função do app** que o Claude do VS Code deve implementar. Está organizada por categoria e marcada com o software que inspira cada uma.

### 6.1 Esboço 2D (Sketch)

| Comando | Alias | Inspiração | Função |
|---------|-------|------------|--------|
| LINE | L | AutoCAD/SW | Cria segmento de reta entre 2 pontos. Modo contínuo (próxima linha começa onde terminou) |
| PLINE | PL | AutoCAD | Polilinha com segmentos retos e arcos |
| CIRCLE | C | AutoCAD/SW | Centro-raio, centro-diâmetro, 3 pontos, tangente-tangente-raio |
| ARC | A | AutoCAD | 3 pontos, início-centro-fim, início-fim-raio |
| RECTANG | REC | AutoCAD | Por 2 cantos, por 3 pontos, com filete |
| POLYGON | POL | AutoCAD | Regular inscrito ou circunscrito (N lados) |
| ELLIPSE | EL | AutoCAD | Centro + 2 eixos |
| SPLINE | SPL | AutoCAD/CATIA | NURBS por pontos de controle |
| POINT | PO | AutoCAD | Ponto auxiliar |
| OFFSET | O | AutoCAD/SW | Entidade paralela à distância d |
| TRIM | TR | AutoCAD | Apara em borda; modo Quick reconhece todos os limites |
| EXTEND | EX | AutoCAD | Estende até borda |
| FILLET | F | AutoCAD/SW | Arredonda canto com raio R |
| CHAMFER | CHA | AutoCAD/SW | Chanfra canto (D1, D2) ou (D, ângulo) |
| MIRROR | MI | AutoCAD/SW | Espelha em torno de linha/eixo |
| COPY | CO | AutoCAD | Copia entidade |
| MOVE | M | AutoCAD | Move por vetor |
| ROTATE | RO | AutoCAD | Rotaciona em torno de ponto |
| SCALE | SC | AutoCAD | Escala (com referência) |
| ARRAY | AR | AutoCAD/SW | Padrão retangular, polar, ao longo de caminho |
| HATCH | H | AutoCAD | Preenche área fechada (hachura padronizada ou sólida) |
| TEXT/MTEXT | T | AutoCAD | Texto em linha ou multi-linha |
| CONVERT-ENT | — | SW | Projeta arestas 3D no plano de esboço |
| TRACE-INTERSECT | — | SW | Cria pontos onde arestas 3D cruzam plano |

**Restrições (Constraints) — SolidWorks/CATIA:**

| Comando | Símbolo | Função |
|---------|---------|--------|
| coincident | ●| Pontos coincidem |
| horizontal | — | Linha horizontal |
| vertical | | | Linha vertical |
| parallel | ‖ | Duas linhas paralelas |
| perpendicular | ⊥ | A 90° |
| tangent | ⌒ | Tangente a círculo/arco |
| concentric | ⊙ | Mesmo centro |
| equal | = | Mesmo tamanho/raio |
| fix | 📌 | Trava em posição absoluta |
| midpoint | ▪ | Ponto no meio de linha |
| symmetric | ↔ | Simétrico em relação a linha de centro |
| distance | ↔42 | Cota dimensional |
| angle | ∠ | Cota angular |
| radius/diameter | R/⌀ | Cota radial |

**Implementação básica de uma função de esboço:**

```typescript
// src/commands/sketch/line.ts
import { useSketchStore } from '@/state/sketchStore';
import { useCommandStore } from '@/state/commandStore';
import { nanoid } from 'nanoid';

export function lineCommand() {
  const cmd = useCommandStore.getState();
  const sketch = useSketchStore.getState();

  cmd.prompt = 'Primeiro ponto:';
  cmd.setHandler('point', (p1) => {
    cmd.prompt = 'Próximo ponto:';
    cmd.setHandler('point', (p2) => {
      sketch.addEntity({
        id: nanoid(), type: 'line', points: [p1, p2],
        construction: false, layerId: cmd.activeLayer
      });
      // permanece em modo de linha contínua (próxima começa em p2)
      lineCommand();
    });
  });
}
```

---

### 6.2 Modelagem 3D (Features)

Estas são as **operações que transformam esboços em sólidos**. Equivalem ao painel Features do SolidWorks / Part Design do CATIA.

#### 6.2.1 Extrude (Ressalto Extrudado)

```typescript
// src/domain/features/Extrude.ts
import * as THREE from 'three';
import type { Sketch, Feature } from '@/domain/types';

export interface ExtrudeParams {
  sketchId: string;
  distance: number;                 // mm
  direction: 'normal' | 'reverse' | 'both' | 'midplane';
  draftAngle?: number;              // graus (saída para moldes)
  thinFeature?: { thickness: number; direction: 'inside'|'outside'|'midplane' };
  endCondition: 'blind' | 'through-all' | 'up-to-vertex' | 'up-to-surface' | 'offset-from-surface';
}

export function evaluateExtrude(sketch: Sketch, p: ExtrudeParams): THREE.BufferGeometry {
  const shape = sketchToShape(sketch);
  const settings: THREE.ExtrudeGeometryOptions = {
    depth: p.distance,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 32,
  };
  let geometry = new THREE.ExtrudeGeometry(shape, settings);
  // aplica direção
  if (p.direction === 'reverse')  geometry.translate(0, 0, -p.distance);
  if (p.direction === 'midplane') geometry.translate(0, 0, -p.distance / 2);
  // aplica draft angle (deformação proporcional à altura)
  if (p.draftAngle) applyDraft(geometry, p.draftAngle);
  return geometry;
}
```

#### 6.2.2 Revolve (Revolução)

```typescript
import * as THREE from 'three';

export interface RevolveParams {
  sketchId: string;
  axisId: string;                   // entidade do tipo line (ou eixo)
  angle: number;                    // 0..360
  direction: 'normal' | 'reverse' | 'both';
}

// Three.js tem LatheGeometry para revolução em torno do eixo Y.
// Para revolução em torno de eixo arbitrário, rotacione o sketch antes
// e gere LatheGeometry, depois aplique a matriz inversa.
export function evaluateRevolve(sketch: Sketch, p: RevolveParams) {
  const points = sketchProfileToPoints(sketch);
  const segments = Math.max(8, Math.ceil((p.angle / 360) * 64));
  const phiStart = 0;
  const phiLength = THREE.MathUtils.degToRad(p.angle);
  return new THREE.LatheGeometry(points, segments, phiStart, phiLength);
}
```

#### 6.2.3 Sweep (Varredura)

Conceito: varre um perfil ao longo de uma trajetória. Use `THREE.ExtrudeGeometry` com `extrudePath` (TubeGeometry para perfis circulares).

#### 6.2.4 Loft (Multi-Seção)

Interpola entre 2+ perfis. Não há nativo no three.js — implemente:
1. Para cada perfil, amostre N pontos com mesma ordem
2. Crie triângulos entre amostras consecutivas
3. Feche as duas extremidades

Ou use `opencascade.js`: `BRepOffsetAPI_ThruSections`.

#### 6.2.5 Fillet (Filete)

Filete de aresta 3D é **difícil sem kernel B-Rep**. Opções:
- **Solução simples (mesh):** suavização por subdivisão (`BufferGeometryUtils.mergeVertices` + `LoopSubdivision`) — qualidade visual, não geométrica
- **Solução correta:** `opencascade.js` → `BRepFilletAPI_MakeFillet`
- **Solução intermediária:** apenas filete em arestas de esboço (2D), que é fácil

```typescript
// src/domain/features/Fillet.ts (versão OCC)
export async function evaluateFillet3D(shape: any, edgeIds: number[], radius: number) {
  const oc = await getOpenCascade();
  const fillet = new oc.BRepFilletAPI_MakeFillet_1(shape);
  for (const edgeId of edgeIds) {
    const edge = getEdgeById(shape, edgeId);
    fillet.Add_2(radius, edge);
  }
  fillet.Build(new oc.Message_ProgressRange_1());
  return fillet.Shape();
}
```

#### 6.2.6 Chamfer, Shell, Draft, Rib

Mesma lógica do fillet: para qualidade real, depende do OCC. Para protótipo, use aproximações:
- **Chamfer:** corta arestas com pequenos planos
- **Shell:** offset interno + corte das tampas
- **Draft:** rotação proporcional de faces selecionadas

#### 6.2.7 Hole Wizard (AutoCAD/SW)

Cria furo padronizado num ponto. Parâmetros: norma (ANSI/ISO/DIN), tipo (passante, cego, escareado, rebaixado, roscado), diâmetro nominal, profundidade. Internamente é uma combinação `cut-extrude` + (opcional) `cut-revolve`.

#### 6.2.8 Pattern Linear / Circular / Mirror

```typescript
export function evaluatePatternLinear(
  baseFeatures: Feature[],
  direction: Vec3,
  count: number,
  spacing: number
): Feature[] {
  const out: Feature[] = [];
  for (let i = 1; i < count; i++) {
    for (const base of baseFeatures) {
      out.push({
        ...structuredClone(base),
        id: nanoid(),
        name: `${base.name} (cópia ${i})`,
        parameters: {
          ...base.parameters,
          translate: vec3MulScalar(direction, spacing * i)
        }
      });
    }
  }
  return out;
}
```

#### 6.2.9 Operações Booleanas

```typescript
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

export function booleanOp(a: THREE.Mesh, b: THREE.Mesh, op: 'union' | 'subtract' | 'intersect') {
  const evaluator = new Evaluator();
  const bA = new Brush(a.geometry, a.material); bA.position.copy(a.position); bA.updateMatrixWorld();
  const bB = new Brush(b.geometry, b.material); bB.position.copy(b.position); bB.updateMatrixWorld();
  const mode = op === 'union' ? ADDITION : op === 'subtract' ? SUBTRACTION : INTERSECTION;
  return evaluator.evaluate(bA, bB, mode);
}
```

---

### 6.3 Helpers de matemática (`src/utils/math.ts`)

Estes helpers serão usados em **todo** o app. Implemente cedo.

```typescript
import * as THREE from 'three';
import type { Vec2, Vec3 } from '@/domain/types';

// ===== distância =====
export const dist2 = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const dist3 = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ===== ponto médio =====
export const mid2 = (a: Vec2, b: Vec2): Vec2 => [(a[0]+b[0])/2, (a[1]+b[1])/2];
export const mid3 = (a: Vec3, b: Vec3): Vec3 =>
  [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2];

// ===== ângulo entre vetores =====
export function angleBetween(v1: Vec3, v2: Vec3): number {
  const a = new THREE.Vector3(...v1);
  const b = new THREE.Vector3(...v2);
  return a.angleTo(b);
}

// ===== normal de plano por 3 pontos =====
export function planeNormal(p1: Vec3, p2: Vec3, p3: Vec3): Vec3 {
  const a = new THREE.Vector3(p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]);
  const b = new THREE.Vector3(p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]);
  const n = a.cross(b).normalize();
  return [n.x, n.y, n.z];
}

// ===== snap a ângulos polares (15°, 30°, 45°, 90°) =====
export function snapAngle(angleRad: number, stepDeg = 15): number {
  const step = THREE.MathUtils.degToRad(stepDeg);
  return Math.round(angleRad / step) * step;
}

// ===== snap a grid =====
export const snapToGrid = (v: number, step: number) => Math.round(v / step) * step;

// ===== conversão de unidades =====
export const mmToInch = (mm: number) => mm / 25.4;
export const inchToMm = (inch: number) => inch * 25.4;

// ===== bounding box AABB =====
export function aabb(points: Vec3[]) {
  const min = [Infinity, Infinity, Infinity] as Vec3;
  const max = [-Infinity, -Infinity, -Infinity] as Vec3;
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max, center: mid3(min, max), size: [max[0]-min[0], max[1]-min[1], max[2]-min[2]] as Vec3 };
}
```

---

### 6.4 Snap Engine (`src/engine/snap.ts`)

Sistema de snap inspirado no OSNAP do AutoCAD — o cursor "cola" em pontos geométricos importantes.

```typescript
import * as THREE from 'three';
import { useUIStore } from '@/state/uiStore';
import type { Vec3 } from '@/domain/types';

export interface SnapHit {
  point: Vec3;
  type: 'endpoint' | 'midpoint' | 'center' | 'intersection' |
        'perpendicular' | 'tangent' | 'grid' | 'nearest';
  distance: number;
  source?: string;                  // qual entidade gerou o snap
}

export function findSnap(
  cursorWorld: Vec3,
  candidates: SnapCandidate[],
  threshold = 5
): SnapHit | null {
  const snaps = useUIStore.getState().snaps;
  const hits: SnapHit[] = [];

  for (const c of candidates) {
    if (snaps.endpoint && c.kind === 'line') {
      for (const p of [c.start, c.end]) {
        const d = distance(cursorWorld, p);
        if (d < threshold) hits.push({ point: p, type: 'endpoint', distance: d, source: c.id });
      }
    }
    if (snaps.midpoint && c.kind === 'line') {
      const m = mid(c.start, c.end);
      const d = distance(cursorWorld, m);
      if (d < threshold) hits.push({ point: m, type: 'midpoint', distance: d, source: c.id });
    }
    if (snaps.center && c.kind === 'circle') {
      const d = distance(cursorWorld, c.center);
      if (d < threshold) hits.push({ point: c.center, type: 'center', distance: d, source: c.id });
    }
    // ...intersection, perpendicular, tangent
    if (snaps.grid) {
      const g = snapToGrid3D(cursorWorld, 1);
      hits.push({ point: g, type: 'grid', distance: distance(cursorWorld, g) });
    }
  }

  // retorna o snap mais próximo
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0] ?? null;
}
```

Renderize um marcador visual diferente para cada tipo de snap (quadrado para endpoint, triângulo para midpoint, círculo para center, etc).

---

### 6.5 Constraint Solver 2D (`src/domain/constraints/ConstraintSolver.ts`)

Para o esboço ficar "totalmente definido" (preto, no SolidWorks). É a parte mais complexa do projeto.

**Opção 1 — Solver próprio (simples, didático):** método de Newton-Raphson sobre um sistema de equações onde cada restrição vira uma equação `f(x) = 0`. Bom para começar com poucas restrições.

**Opção 2 — Biblioteca pronta:** `planegcs` (porta WebAssembly do solver do FreeCAD). Mais robusto.

```bash
npm install @salusoft89/planegcs
```

```typescript
import { GcsSystem } from '@salusoft89/planegcs';

export async function solveSketch(sketch: Sketch): Promise<Sketch> {
  const gcs = await GcsSystem.create();
  const paramMap = new Map<string, number>();

  // 1) adicionar parâmetros (coordenadas de cada ponto)
  for (const e of sketch.entities) {
    e.points.forEach((p, i) => {
      paramMap.set(`${e.id}.p${i}.x`, gcs.addParam(p[0]));
      paramMap.set(`${e.id}.p${i}.y`, gcs.addParam(p[1]));
    });
  }

  // 2) adicionar constraints
  for (const c of sketch.constraints) {
    switch (c.type) {
      case 'coincident':   gcs.addConstraintP2PCoincident(...); break;
      case 'horizontal':   gcs.addConstraintHorizontal(...);   break;
      case 'parallel':     gcs.addConstraintParallel(...);     break;
      // ...
    }
  }

  // 3) resolver
  const status = gcs.solve();
  // 4) ler resultados de volta
  // ...
  return updatedSketch;
}
```

---

### 6.6 Comando de Regeneração / Evaluator

Função-chave: pega o `Document` (árvore de features) e produz a cena 3D.

```typescript
// src/engine/evaluator.ts
import * as THREE from 'three';
import type { Document, Feature } from '@/domain/types';

export interface EvalResult {
  meshes: Map<string, THREE.Mesh>;   // featureId → mesh
  errors: Map<string, string>;
}

export async function evaluate(doc: Document): Promise<EvalResult> {
  const result: EvalResult = { meshes: new Map(), errors: new Map() };
  let currentBody: THREE.BufferGeometry | null = null;

  for (const f of doc.features) {
    if (f.suppressed) continue;
    try {
      const geom = await evaluateFeature(f, doc, currentBody);
      const mesh = new THREE.Mesh(geom, defaultMaterial(f, doc));
      result.meshes.set(f.id, mesh);
      currentBody = geom;             // próxima feature opera sobre esta
    } catch (err) {
      result.errors.set(f.id, String(err));
    }
  }
  return result;
}
```

Esta função é **chamada toda vez que algo no documento muda** (use `useDocumentStore.subscribe`). Para performance, faça cache por feature ID — só recalcula a partir da feature alterada.

---

## 7. Sistema de comandos (linha de comando + atalhos)

Estrutura inspirada no `acad.pgp` do AutoCAD.

```typescript
// src/commands/aliases.ts
export const ALIASES: Record<string, string> = {
  // 2D
  L: 'LINE', PL: 'PLINE', C: 'CIRCLE', A: 'ARC',
  REC: 'RECTANG', POL: 'POLYGON', EL: 'ELLIPSE', SPL: 'SPLINE', PO: 'POINT',
  O: 'OFFSET', TR: 'TRIM', EX: 'EXTEND',
  F: 'FILLET', CHA: 'CHAMFER',
  M: 'MOVE', CO: 'COPY', MI: 'MIRROR', RO: 'ROTATE', SC: 'SCALE',
  AR: 'ARRAY', H: 'HATCH', T: 'TEXT',
  // 3D
  EXT: 'EXTRUDE', REV: 'REVOLVE', SW: 'SWEEP', LO: 'LOFT',
  SH: 'SHELL', BO: 'BOOLEAN',
  // Anotação
  DI: 'DIMENSION', DLI: 'DIMLINEAR', DRA: 'DIMRADIUS', DDI: 'DIMDIAMETER',
  // Layers (AutoCAD)
  LA: 'LAYER',
  // Vista
  Z: 'ZOOM', P: 'PAN', V: 'VIEW',
};

// src/commands/registry.ts
import { lineCommand, circleCommand, /* ... */ } from './sketch';
import { extrudeCommand, revolveCommand, /* ... */ } from './modeling';

export const COMMANDS: Record<string, () => void> = {
  LINE: lineCommand,
  CIRCLE: circleCommand,
  RECTANG: rectangCommand,
  EXTRUDE: extrudeCommand,
  REVOLVE: revolveCommand,
  FILLET: filletCommand,
  // ...
};

// src/commands/parser.ts
export function executeCommand(input: string) {
  const upper = input.trim().toUpperCase();
  const cmd = ALIASES[upper] || upper;
  const fn = COMMANDS[cmd];
  if (fn) fn();
  else console.warn(`Comando desconhecido: ${input}`);
}
```

**Atalhos globais** (hotkeys):
- `Esc` → cancela comando atual
- `Enter` ou `Space` → confirma / repete último
- `Ctrl+Z` / `Ctrl+Y` → undo / redo (via `zundo`)
- `Ctrl+S` → salvar (JSON local + opcional Google Drive)
- `F8` → ortho on/off
- `F3` → object snap on/off

---

## 8. Importação / Exportação

| Formato | Importa | Exporta | Biblioteca |
|---------|---------|---------|------------|
| **DXF** (AutoCAD) | ✅ | ✅ | `dxf-parser` + `dxf-writer` |
| **STL** | ✅ | ✅ | `three/examples/jsm/loaders/STLLoader` + `STLExporter` |
| **OBJ** | ✅ | ✅ | `OBJLoader` + `OBJExporter` |
| **GLTF/GLB** | ✅ | ✅ | `GLTFLoader` + `GLTFExporter` |
| **STEP** | ✅ | ✅ | `opencascade.js` |
| **IGES** | ✅ | parcial | `opencascade.js` |
| **PDF** | ❌ | ✅ | `jspdf` (gera prancha 2D) |
| **JSON nativo** | ✅ | ✅ | nativo (Document → JSON.stringify) |

```typescript
// src/engine/exporters/stl.ts
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export function exportSTL(scene: THREE.Scene, filename: string) {
  const exporter = new STLExporter();
  const data = exporter.parse(scene, { binary: true });
  const blob = new Blob([data], { type: 'application/octet-stream' });
  triggerDownload(blob, filename);
}
```

---

## 9. Montagens (Assembly)

**Conceito SolidWorks/CATIA absorvido:** uma montagem é um documento que referencia outros documentos (peças) + restrições (mates) entre eles.

```typescript
// solver de mate (kinematic constraint) é simples para casos triviais:
//   - coincident face-face → alinha normais e posiciona
//   - concentric edge-edge → alinha eixos
//   - distance → mantém d entre referências
// Para sistemas com muitos mates, é necessário um solver iterativo
// (Lagrange multipliers ou redução por graus de liberdade).
```

**Lista de mates a suportar** (mesma do SolidWorks):
- Coincident, Parallel, Perpendicular, Tangent, Concentric, Lock
- Distance, Angle
- Mecânicos: Gear (razão), Rack-Pinion, Screw, Cam, Hinge, Slot

**Detecção de interferência:** percorra todas as bounding boxes, e quando houver sobreposição rode CSG-Intersect — se volume > 0, há colisão.

---

## 10. PLM-Light (controle de revisões)

Inspirado no ENOVIA (CATIA) e PDM (SolidWorks), versão simples adequada à WR Solution.

```typescript
export interface Revision {
  id: string;
  number: string;                   // "A", "B", "01", "02"
  author: string;
  createdAt: string;
  description: string;
  snapshot: Document;               // deep copy do estado
  parentRevision?: string;
  status: 'work-in-progress' | 'in-review' | 'released' | 'obsolete';
}
```

Persistência: pode usar Google Drive como backend (você já trabalha com Apps Script no Conquist House), ou IndexedDB local (`idb-keyval`). Cada revisão = um arquivo JSON.

---

## 11. Roadmap sugerido de implementação

> Implemente nesta ordem. Cada fase deve ser uma branch separada e testada antes da próxima.

### **Fase 1 — Esqueleto (semana 1-2)**
1. Estrutura de pastas
2. Tipos em `domain/types.ts`
3. Layout React com Ribbon + FeatureTree + Viewport + StatusBar + CommandLine (todos vazios mas posicionados)
4. R3F com cena básica (grid + viewcube + iluminação)
5. Stores Zustand vazios mas tipados

### **Fase 2 — Esboço 2D (semana 3-4)**
1. Plano de esboço (XY/YZ/XZ + custom)
2. Comandos: LINE, CIRCLE, RECTANG
3. Snap básico: endpoint, midpoint, grid
4. Sistema de coordenadas relativas/polares na linha de comando
5. Render do esboço em 3D (LineSegments)

### **Fase 3 — Primeira feature 3D (semana 5)**
1. Comando EXTRUDE (extrusão de esboço fechado)
2. Evaluator básico
3. FeatureTree mostra a feature criada
4. PropertiesPanel edita parâmetros e regenera

### **Fase 4 — Camadas e Blocos (semana 6)**
1. LayerPanel funcional
2. Cada entidade pertence a uma camada
3. Sistema de blocos (criar, inserir, editar atributos)

### **Fase 5 — Mais features (semana 7-8)**
1. REVOLVE, SWEEP, LOFT
2. CUT-EXTRUDE, CUT-REVOLVE (operações booleanas via `three-bvh-csg`)
3. PATTERN (linear, circular), MIRROR

### **Fase 6 — Restrições paramétricas (semana 9-10)**
1. Integrar `planegcs` (ou solver próprio)
2. Constraints: coincident, horizontal, vertical, parallel, perpendicular, tangent, equal
3. Constraints dimensionais (distance, angle, radius)
4. Indicador visual de sketch "totalmente definido"

### **Fase 7 — Acabamentos (semana 11-12)**
1. FILLET / CHAMFER (via OCC, opcional)
2. SHELL, DRAFT
3. HOLE WIZARD (biblioteca de furos padronizados)

### **Fase 8 — Anotação e exportação (semana 13)**
1. Dimensões (linear, angular, radial)
2. Export STL/OBJ/GLTF
3. Export DXF (esboços 2D)
4. Geração de prancha 2D simples (PDF)

### **Fase 9 — Montagem (semana 14-15)**
1. Documento tipo "assembly"
2. Inserir peças, posicionar
3. Mates básicos (coincident, concentric, distance)
4. Detecção de interferência

### **Fase 10 — PLM-Light e Cloud (semana 16+)**
1. Sistema de revisões
2. Save/Load via Google Drive (Apps Script — você já domina)
3. Compartilhamento por link
4. Comentários no modelo

---

## 12. Princípios de código (para evitar o problema de contexto)

Você mencionou que sofre com perda de coerência em arquivos JS gigantes (3.000-4.000 linhas). Aplicar essas regras desde o dia 1 evita isso:

1. **Um arquivo, uma responsabilidade.** Cada feature (extrude, fillet, revolve) em seu próprio arquivo, com menos de 300 linhas. Se passar disso, dividir.

2. **Tipos antes de tudo.** `domain/types.ts` é a "constituição" do projeto. Todo código novo deve referenciar tipos daí, nunca redefinir. Quando o Claude do VS Code abrir um arquivo, basta ele ler `types.ts` para entender o universo todo.

3. **Stores Zustand pequenos e específicos.** Não tenha um `appStore` gigante. Tenha `documentStore`, `uiStore`, `selectionStore`, `commandStore` — cada um com 100-200 linhas no máximo.

4. **Convenções de nomenclatura inegociáveis:**
   - Componentes: `PascalCase` (ex: `FeatureTree`, `RibbonButton`)
   - Hooks: `useCamelCase` (ex: `useActiveSketch`)
   - Stores: `useXxxStore` (ex: `useDocumentStore`)
   - Tipos: `PascalCase` (ex: `Feature`, `Sketch`)
   - Funções utilitárias: `camelCase` (ex: `evaluateExtrude`)
   - Constantes globais: `SCREAMING_SNAKE_CASE` (ex: `ALIASES`, `DEFAULT_LAYER`)

5. **Comentário de cabeçalho em todo arquivo:**
   ```typescript
   /**
    * src/domain/features/Extrude.ts
    * Feature de extrusão (Boss Extruded). Gera um sólido a partir de um esboço fechado.
    * Inspirado: SolidWorks (Boss-Extrude), CATIA (Pad), AutoCAD (EXTRUDE).
    * Depende de: types.ts, math.ts
    */
   ```
   Isso ajuda muito o Claude do VS Code quando ele abre um arquivo isolado.

6. **Imports absolutos** via tsconfig (`@/domain/types`, `@/state/...`). Imports relativos `../../../` matam a manutenção.

7. **Testes mínimos por feature.** Use `vitest` para testar o evaluator de cada feature isoladamente. Quando o Claude do VS Code mexer numa feature e quebrar outra, os testes mostram.

8. **Documente as decisões na hora.** Crie um `docs/` na raiz com:
   - `architecture.md` — visão geral (reaproveite seções deste arquivo)
   - `glossary.md` — vocabulário CAD (feature, sketch, mate, body, layer)
   - `decisions.md` — registro de decisões (ex: "por que escolhi Zustand vez Redux")

---

## 13. Referências rápidas (para o Claude do VS Code)

### Comandos canônicos por software

```
AutoCAD     SolidWorks         CATIA              WRCAD (este projeto)
─────────────────────────────────────────────────────────────────────
LINE        Line               Profile/Line       LINE / L
CIRCLE      Circle             Circle             CIRCLE / C
RECTANG     Rectangle          Rectangle          RECTANG / REC
TRIM        Trim               Trim               TRIM / TR
OFFSET      Offset Entities    Offset             OFFSET / O
FILLET      Sketch Fillet      Corner             FILLET / F
EXTRUDE     Boss-Extrude       Pad                EXTRUDE / EXT
REVOLVE     Revolved Boss      Shaft              REVOLVE / REV
SWEEP       Swept Boss         Rib                SWEEP / SW
LOFT        Lofted Boss        Multi-Section      LOFT / LO
FILLET 3D   Fillet             Edge Fillet        FILLET / F (3D)
SHELL       Shell              Shell              SHELL / SH
SUBTRACT    Combine-Subtract   Remove             BOOLEAN-SUBTRACT
PATTERN     Linear Pattern     Rect. Pattern      PATTERN-LINEAR
ARRAY       Circular Pattern   Circ. Pattern      PATTERN-CIRCULAR
MIRROR      Mirror             Mirror             MIRROR / MI
HOLE        Hole Wizard        Hole               HOLE
LAYER       —                  —                  LAYER / LA
BLOCK       —                  Catalog            BLOCK / B
DIMENSION   Smart Dimension    Constraint         DIMENSION / DI
```

### Mapeamento conceitual

| AutoCAD | SolidWorks | CATIA | WRCAD |
|---------|-----------|-------|-------|
| DWG (arquivo) | .sldprt | .CATPart | Document (JSON) |
| Layer | (não tem) | (não tem) | Layer |
| Block | (não tem direto) | Catalog/PowerCopy | Block |
| (não tem) | Feature | Feature | Feature |
| (não tem) | FeatureManager Tree | Specification Tree | FeatureTree |
| (não tem) | Mate | Constraint (Assembly) | Mate |
| Paper Space + Layout | Drawing | Drafting | Drawing (kind do Document) |
| Ribbon | CommandManager | Workbench Toolbars | Ribbon |
| Command Line | (não tem) | Power Input | CommandLine |
| OSNAP | (snap automático) | (snap automático) | Snap Engine |

---

## 14. Checklist final para o Claude do VS Code

Quando for implementar qualquer feature nova, peça (ou se autoperguntar):

- [ ] O tipo está em `domain/types.ts`?
- [ ] A função de evaluator está em `domain/features/<Nome>.ts`?
- [ ] O comando está registrado em `commands/registry.ts`?
- [ ] O alias (se houver) está em `commands/aliases.ts`?
- [ ] O botão do ribbon está na aba correta?
- [ ] O painel de propriedades trata esse tipo de feature?
- [ ] A árvore mostra ícone correto para o tipo?
- [ ] Funciona com undo/redo (passou pelo store)?
- [ ] Tem teste mínimo no `__tests__/`?

---

**Fim do documento.** Este arquivo deve ser anexado ao Claude do VS Code como contexto raiz do projeto. Sempre que abrir uma nova sessão, comece com:

> "Estou trabalhando no projeto WRCAD. Leia o arquivo `WRCAD_SPEC.md` antes de qualquer coisa. Vamos implementar agora: [feature específica]."
