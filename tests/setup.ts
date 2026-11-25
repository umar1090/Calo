import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';

// jsdom exposes a partial crypto; make sure SubtleCrypto is the real Node implementation.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
