/**
 * src/utils/ids.ts
 * Geração de IDs únicos para entidades do WRCAD (features, sketches, layers, etc).
 */
import { nanoid } from 'nanoid';

export const newId = (): string => nanoid(12);
