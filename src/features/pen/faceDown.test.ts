import { describe, expect, it } from 'vitest';
import { advance, isFaceDown } from './faceDown';

describe('face-down timer', () => {
  it('detects a phone lying face down', () => {
    expect(isFaceDown(178, 3)).toBe(true);
    expect(isFaceDown(-175, -10)).toBe(true);
    expect(isFaceDown(2, 1)).toBe(false); // face up on the table
    expect(isFaceDown(80, 0)).toBe(false); // held upright
    expect(isFaceDown(null, null)).toBe(false);
  });

  it('only counts time while running', () => {
    let s = { elapsed: 0, since: null as number | null };
    s = advance(s, true, 1000); // put down
    s = advance(s, false, 4000); // picked up after 3 s
    s = advance(s, false, 9000); // still in hand
    s = advance(s, true, 9000); // put down again
    s = advance(s, true, 11000);
    expect(s.elapsed).toBe(5000);
  });
});
