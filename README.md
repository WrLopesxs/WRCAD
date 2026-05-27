# WRCAD

CAD paramétrico 3D rodando no navegador. Sem instalação, sem licença, sem login.

> **Posicionamento**: o WRCAD não tenta substituir SolidWorks/CATIA/AutoCAD. É a alternativa pra **prototipagem rápida + impressão 3D + ensino**: clica num link, modela, exporta STL, manda pra impressora — sem instalar nada de 15GB.

## Stack

- **Vite + React 18 + TypeScript**
- **Three.js + @react-three/fiber + @react-three/drei** (3D)
- **Zustand + zundo** (estado + undo/redo)
- **three-bvh-csg** (boolean operations no mesh)
- **Tailwind CSS** (UI, com tema claro/escuro via CSS vars)

## O que já está pronto

### Modelagem
- **Esboço 2D** em planos (XY/YZ/XZ) com linhas, círculos, retângulos, linhas de eixo
- **Snap** automático em endpoint/midpoint/center/grid
- **Coordenadas digitadas**: absolutas (`100,50`), relativas (`@50,30`), polares (`@100<45`)
- **Edição** e exclusão de esboços (com cascade nos features dependentes)

### Features 3D
- **EXTRUDE** com chanfro/filete configurável nas arestas
- **REVOLVE** (revolução em torno de linha de construção)
- **CUT-EXTRUDE** e **CUT-REVOLVE** (subtração)
- **MIRROR** (espelhamento em planos XY/YZ/XZ)
- **PATTERN LINEAR** e **PATTERN CIRCULAR** (replicação)
- **HOLE WIZARD** com 4 tipos (passante, cego, escareado, rebaixado) e **3D picking** (clica numa face do sólido)

### Primitivas plug-and-play
- **Cubo, Cilindro, Esfera, Cone, Toro** — clica e aparece pronto
- **Cor própria** por primitiva + paleta rápida de 8 swatches
- **Click no viewport** seleciona a peça (com glow amarelo + outline)
- **Gizmo 3D** pra arrastar nos eixos X/Y/Z

### Viewport
- **Câmera** com pan/zoom/orbit (mouse + setas do teclado, fluido contínuo)
- **Limites de câmera**: não passa do horizonte nem do plano da grid
- **ViewCube** clicável (top/front/right/etc)
- **Modo claro/escuro** com toggle no rodapé

### File I/O
- **Salvar JSON** (formato nativo) — download
- **Abrir JSON** — file picker
- **Exportar STL** binário pra impressão 3D
- **Undo/Redo** (Ctrl+Z / Ctrl+Y)

## Roadmap (próximas fases)

- **Fase 6**: constraints paramétricas (perpendicular, paralelo, tangente…) via `planegcs`
- **Fase 8**: cotagem 2D, export DXF/STEP, prancha PDF
- **Fase 9**: montagens (assemblies) com mates
- **Fase 10**: persistência em cloud + versionamento

Documento mestre: [`Softwares estudo/WRCAD_SPEC.md`](Softwares%20estudo/WRCAD_SPEC.md).

## Como rodar

```bash
pnpm install
pnpm run dev
```

Abre `http://localhost:5173`.

Build de produção:

```bash
pnpm run build
pnpm run preview
```

## Estrutura de pastas

```
src/
├── app/                # Shell React, Layout, ErrorBoundary
├── domain/
│   ├── types.ts        # "Constituição" do projeto — todos os tipos centrais
│   └── features/       # Evaluators por tipo de feature (Extrude, Revolve, ...)
├── engine/             # Motor: evaluator, snap, boolean ops, sketch→shape
├── state/              # Stores Zustand (document, ui, selection, command, sketch)
├── commands/           # Sistema de comandos + aliases + I/O
├── ui/
│   ├── ribbon/         # Barra de abas + botões
│   ├── trees/          # Árvore de features + camadas
│   ├── panels/         # PropertyManager + CommandLine
│   ├── statusbar/      # Toggles de snap, tema, info
│   └── viewport/       # Canvas 3D + gizmo + overlays
└── utils/              # ids, math
```

## Autor

WR Solution (Wender Lopes)

Construído de forma incremental em conjunto com o Claude (Anthropic).
