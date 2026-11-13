import { describe, expect, it } from 'vitest';
import words from '../data/words.json';
import { decryptUpdate, deriveFriendship, encryptUpdate, fingerprint, generateIdentity } from './friendCrypto';

describe('words list', () => {
  it('has 256 unique words', () => {
    expect(words.length).toBe(256);
    expect(new Set(words).size).toBe(256);
  });
});

describe('friendship derivation', () => {
  it('two devices derive the same mailbox, words and key', async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();
    const a = await deriveFriendship(alice.privateKey, alice.publicB64, bob.publicB64);
    const b = await deriveFriendship(bob.privateKey, bob.publicB64, alice.publicB64);
    expect(a.mailboxId).toBe(b.mailboxId);
    expect(a.mailboxId).toMatch(/^[0-9a-f]{32}$/);
    expect(a.words).toEqual(b.words);
    const msg = await encryptUpdate(a.key, { stage: 3 });
    expect(await decryptUpdate(b.key, msg)).toEqual({ stage: 3 });
  });

  it('a third device cannot decrypt and gets a different mailbox', async () => {
    const [alice, bob, eve] = await Promise.all([generateIdentity(), generateIdentity(), generateIdentity()]);
    const ab = await deriveFriendship(alice.privateKey, alice.publicB64, bob.publicB64);
    const eb = await deriveFriendship(eve.privateKey, eve.publicB64, bob.publicB64);
    expect(eb.mailboxId).not.toBe(ab.mailboxId);
    const msg = await encryptUpdate(ab.key, { secret: true });
    await expect(decryptUpdate(eb.key, msg)).rejects.toThrow();
  });

  it('rejects own key and garbage keys', async () => {
    const me = await generateIdentity();
    await expect(deriveFriendship(me.privateKey, me.publicB64, me.publicB64)).rejects.toThrow();
    await expect(deriveFriendship(me.privateKey, me.publicB64, 'bm90IGEga2V5')).rejects.toThrow();
  });

  it('private key is not extractable', async () => {
    const me = await generateIdentity();
    expect(me.privateKey.extractable).toBe(false);
  });

  it('fingerprint is stable', async () => {
    const me = await generateIdentity();
    expect(await fingerprint(me.publicB64)).toBe(await fingerprint(me.publicB64));
  });
});
