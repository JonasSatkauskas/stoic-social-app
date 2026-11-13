import { describe, expect, it } from 'vitest';
import { detectTopic, initialTalk, MAX_QUESTIONS, talkReducer, type TalkState } from './machine';

const submit = (s: TalkState, text: string) => talkReducer(s, { type: 'submit', text, seed: 1 });

describe('talk machine', () => {
  it('detects topics', () => {
    expect(detectTopic('My boss moved the deadline again')).toBe('work');
    expect(detectTopic('I am so worried about the future')).toBe('worry');
    expect(detectTopic('the weather is grey')).toBe('other');
  });

  it('asks at most two questions, then closes', () => {
    let s = submit(initialTalk, 'I had a fight with my sister');
    expect(s.step).toBe('ask');
    s = submit(s, 'She said I never listen');
    expect(s.step).toBe('ask');
    if (s.step === 'ask') expect(s.asked).toBe(MAX_QUESTIONS);
    s = submit(s, 'I could call her tomorrow');
    expect(s.step).toBe('close');
    const appMessages = s.step === 'close' ? s.messages.filter((m) => m.from === 'app') : [];
    expect(appMessages).toHaveLength(2);
  });

  it('close is terminal: further input changes nothing', () => {
    let s = submit(initialTalk, 'work is a lot');
    s = submit(s, 'a');
    s = submit(s, 'b');
    expect(s.step).toBe('close');
    expect(submit(s, 'more')).toBe(s);
  });

  it('crisis signs end the flow at any step', () => {
    expect(submit(initialTalk, 'I want to end my life').step).toBe('crisis');
    const s = submit(initialTalk, 'work is a lot');
    expect(submit(s, 'I want to kill myself').step).toBe('crisis');
    expect(submit({ step: 'crisis' }, 'ok').step).toBe('crisis');
  });

  it('empty input is ignored', () => {
    expect(submit(initialTalk, '   ')).toBe(initialTalk);
  });

  it('finish ends early', () => {
    const s = submit(initialTalk, 'work is a lot');
    expect(talkReducer(s, { type: 'finish' }).step).toBe('close');
  });
});
