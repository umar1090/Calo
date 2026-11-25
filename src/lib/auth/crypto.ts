/**
 * Web Crypto helpers: PBKDF2 key derivation and AES-GCM encryption.
 * Nothing here is home-grown cryptography; it only wires up standard primitives.
 */

export const DEFAULT_ITERATIONS = 310_000;

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i += 0x8000) s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return toB64(randomBytes(16)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 22);
}

export interface DerivedKeys {
  /** SHA-256 of the authentication half; stored to verify passwords. */
  verifier: string;
  /** Raw 256-bit AES key bytes (kept only in memory / session). */
  encKeyRaw: Uint8Array<ArrayBuffer>;
}

/** PBKDF2-SHA256 → 512 bits, split into an auth half and an encryption half. */
export async function deriveKeys(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<DerivedKeys> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 512));
  const authHalf = bits.slice(0, 32);
  const encHalf = bits.slice(32, 64);
  const verifier = toB64(await crypto.subtle.digest('SHA-256', authHalf));
  return { verifier, encKeyRaw: encHalf };
}

export function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export interface Sealed {
  v: 1;
  iv: string;
  ct: string;
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { v: 1, iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

/** Constant-time string comparison for verifiers. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
