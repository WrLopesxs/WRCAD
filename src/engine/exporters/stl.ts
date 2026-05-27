/**
 * src/engine/exporters/stl.ts
 * Export STL (formato padrão pra impressão 3D / slicers tipo Cura, PrusaSlicer).
 * Usa STLExporter do three.js sobre uma cena temporária que envolve só o
 * corpo final do documento.
 *
 * Saída: binary STL (mais compacto que ASCII; suportado por TODO slicer).
 */
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { CADDocument } from '@/domain/types';
import { evaluate } from '@/engine/evaluator';

export interface STLExportResult {
  bytes: number;
  filename: string;
}

export function exportToSTL(doc: CADDocument, filename?: string): STLExportResult {
  const results = evaluate(doc);
  let finalGeom: THREE.BufferGeometry | null = null;
  for (const [, entry] of results) {
    if (entry.isFinal) {
      finalGeom = entry.geometry;
      break;
    }
  }
  if (!finalGeom) {
    throw new Error(
      'Nenhuma peça pronta para exportar. Crie pelo menos uma extrusão ou revolução primeiro.',
    );
  }
  const pos = finalGeom.getAttribute('position');
  if (!pos || pos.count === 0) {
    throw new Error('Peça vazia (sem geometria). Verifique se as features não estão com erro.');
  }

  // monta cena temporária
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(finalGeom, new THREE.MeshStandardMaterial());
  scene.add(mesh);

  const exporter = new STLExporter();
  // binary: true → retorna DataView; binary: false → retorna string ASCII
  const data = exporter.parse(scene, { binary: true }) as DataView;

  const safeName = (filename ?? sanitize(doc.name) ?? 'wrcad-part') + '.stl';
  // Copia para um ArrayBuffer "puro" — TS estrito recusa o SharedArrayBufferLike
  // que o DataView do exporter pode carregar.
  const arr = new Uint8Array(data.byteLength);
  for (let i = 0; i < data.byteLength; i++) arr[i] = data.getUint8(i);
  const blob = new Blob([arr], { type: 'application/sla' });
  triggerDownload(blob, safeName);

  return { bytes: arr.byteLength, filename: safeName };
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
