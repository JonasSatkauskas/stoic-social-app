import { describe, expect, it } from 'vitest';
import { hasCrisisSigns } from './safety';

describe('hasCrisisSigns', () => {
  it.each([
    'I want to kill myself',
    'sometimes I think about suicide',
    'I just want to end my life',
    'everyone would be better off without me',
    'I keep hurting myself',
    'I don’t want to live anymore',
    'there is no reason to live',
    'I have been self-harming',
    'my partner hits me',
  ])('flags: %s', (text) => {
    expect(hasCrisisSigns(text)).toBe(true);
  });

  it.each([
    'my boss is annoying and the deadline is tomorrow',
    'I am tired and bored',
    'this project is killing me slowly lol',
    'I had a fight with my sister',
    'I am worried about the exam',
  ])('does not flag: %s', (text) => {
    expect(hasCrisisSigns(text)).toBe(false);
  });
});
