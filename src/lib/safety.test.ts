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
    'I do not want to live anymore',
    'I dont want to wake up tomorrow',
    'I cannot go on like this',
    'there is no point in living',
    'I can\u2019t take it anymore',
  ])('flags: %s', (text) => {
    expect(hasCrisisSigns(text)).toBe(true);
  });

  it.each([
    'my boss is annoying and the deadline is tomorrow',
    'I am tired and bored',
    'this project is killing me slowly lol',
    'I had a fight with my sister',
    'I am worried about the exam',
    'I do not want to go to work',
    'I can go on a walk later',
  ])('does not flag: %s', (text) => {
    expect(hasCrisisSigns(text)).toBe(false);
  });
});
