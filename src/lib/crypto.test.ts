import { describe, expect, it } from 'vitest';
import {
  decryptJSON,
  decryptWithPassphrase,
  encryptJSON,
  encryptWithPassphrase,
  generateDeviceKey,
  toB64,
} from './crypto';

describe('device encryption', () => {
  it('round trips JSON', async () => {
    const key = await generateDeviceKey();
    const value = { text: 'a private note', n: 3 };
    const sealed = await encryptJSON(key, value);
    expect(await decryptJSON(key, sealed)).toEqual(value);
  });

  it('ciphertext does not contain the plain text', async () => {
    const key = await generateDeviceKey();
    const sealed = await encryptJSON(key, 'secret words here');
    expect(new TextDecoder().decode(sealed.data)).not.toContain('secret');
  });

  it('never reuses an IV', async () => {
    const key = await generateDeviceKey();
    const ivs = new Set<string>();
    for (let i = 0; i < 500; i++) ivs.add(toB64((await encryptJSON(key, 'same')).iv));
    expect(ivs.size).toBe(500);
  });

  it('a different key cannot decrypt', async () => {
    const sealed = await encryptJSON(await generateDeviceKey(), 'x');
    await expect(decryptJSON(await generateDeviceKey(), sealed)).rejects.toThrow();
  });

  it('device key is not extractable', async () => {
    const key = await generateDeviceKey();
    expect(key.extractable).toBe(false);
  });
});

describe('passphrase encryption', () => {
  const ITER = 1000; // fast for tests; the app uses 600 000

  it('round trips with the right passphrase', async () => {
    const blob = await encryptWithPassphrase('correct horse', { notes: ['a'] }, ITER);
    expect(await decryptWithPassphrase('correct horse', blob)).toEqual({ notes: ['a'] });
  });

  it('fails with the wrong passphrase', async () => {
    const blob = await encryptWithPassphrase('correct horse', { notes: ['a'] }, ITER);
    await expect(decryptWithPassphrase('wrong horse', blob)).rejects.toThrow();
  });

  it('uses a fresh salt and IV each time', async () => {
    const a = await encryptWithPassphrase('p', 1, ITER);
    const b = await encryptWithPassphrase('p', 1, ITER);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it('defaults to 600000 iterations', async () => {
    const blob = await encryptWithPassphrase('p', 1);
    expect(blob.iter).toBe(600000);
  }, 20000);
});
