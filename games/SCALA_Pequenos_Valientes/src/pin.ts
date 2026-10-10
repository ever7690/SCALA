import type { PinRecord } from './state.ts';

const toHex = (buffer: ArrayBuffer | Uint8Array): string => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const saltBytes = (salt: string): Uint8Array<ArrayBuffer> => new Uint8Array(salt.match(/.{2}/gu)!.map(byte => parseInt(byte, 16)));
async function hash(secret: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes(salt), iterations: 120000, hash: 'SHA-256' }, key, 256));
}
const equal = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};
export async function createPin(pin: string): Promise<{ record: PinRecord; recovery: string }> {
  if (!/^\d{4}$/u.test(pin)) throw new Error('El PIN debe tener cuatro cifras.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const recoverySalt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const recovery = toHex(crypto.getRandomValues(new Uint8Array(8))).toUpperCase();
  return { record: { salt, hash: await hash(pin, salt), recoverySalt, recoveryHash: await hash(recovery, recoverySalt) }, recovery };
}
export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  return /^\d{4}$/u.test(pin) && equal(await hash(pin, record.salt), record.hash);
}
export async function verifyRecovery(recovery: string, record: PinRecord): Promise<boolean> {
  const secret = recovery.replaceAll(/[^a-f0-9]/giu, '').toUpperCase();
  return secret.length === 16 && equal(await hash(secret, record.recoverySalt), record.recoveryHash);
}
