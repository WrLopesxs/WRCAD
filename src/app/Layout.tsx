/**
 * src/app/Layout.tsx
 * Layout principal: Viewport ocupa toda a área de trabalho como camada de fundo.
 * FeatureTree, Properties e CommandLine flutuam como painéis fosco-translúcidos
 * sobre o viewport (estilo Shapr3D/Onshape moderno).
 * Ribbon e StatusBar permanecem ancorados topo/rodapé.
 */
import { Ribbon } from '@/ui/ribbon/Ribbon';
import { FeatureTree } from '@/ui/trees/FeatureTree';
import { PropertiesPanel } from '@/ui/panels/PropertiesPanel';
import { CommandLine } from '@/ui/panels/CommandLine';
import { StatusBar } from '@/ui/statusbar/StatusBar';
import { Viewport } from '@/ui/viewport/Viewport';
import { SketchModeBanner } from '@/ui/viewport/SketchModeBanner';
import { PickingBanner } from '@/ui/viewport/PickingBanner';
import { useUIStore } from '@/state/uiStore';

export function Layout() {
  const panels = useUIStore((s) => s.panels);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-fg overflow-hidden">
      <Ribbon />

      {/* área de trabalho — viewport em camada de fundo, painéis flutuantes por cima */}
      <div className="flex-1 relative overflow-hidden">
        <Viewport />
        <SketchModeBanner />
        <PickingBanner />

        {panels.featureTree && (
          <div className="absolute top-3 left-3 bottom-3 w-[260px] z-10">
            <FeatureTree />
          </div>
        )}

        {panels.properties && (
          <div className="absolute top-3 right-3 w-[280px] z-10 max-h-[calc(100%-1.5rem)]">
            <PropertiesPanel />
          </div>
        )}

        {panels.commandLine && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-1.5rem))] z-10">
            <CommandLine />
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  );
}
