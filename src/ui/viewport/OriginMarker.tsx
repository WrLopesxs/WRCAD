/**
 * src/ui/viewport/OriginMarker.tsx
 * Esfera pequena no ponto (0,0,0) com glow accent. Marca a origem do sistema
 * de coordenadas — a cena nunca fica completamente vazia, sempre existe um
 * "ponto de ancoragem" visual.
 */
import type { Theme } from '@/domain/types';

interface OriginMarkerProps {
  theme: Theme;
}

export function OriginMarker({ theme }: OriginMarkerProps) {
  const color = theme === 'dark' ? '#fde047' : '#ca8a04';

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* halo sutil */}
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}
