/**
 * Talk it out, then go. A fixed flow:
 * listen -> (safety) -> ask 1 -> (safety) -> ask 2 -> (safety) -> close.
 * MAX_QUESTIONS is enforced here, not in any prompt. Close is terminal.
 */
import bank from '../../data/questions.json';
import { hasCrisisSigns } from '../../lib/safety';

export const MAX_QUESTIONS = 2;

export interface Message {
  from: 'you' | 'app';
  text: string;
  /** The answer was written on paper; the app never sees it. */
  paper?: boolean;
}

export type TalkState =
  | { step: 'listen' }
  | { step: 'ask'; asked: number; topic: string; question: string; messages: Message[] }
  | { step: 'close'; messages: Message[] }
  | { step: 'crisis' };

export type TalkEvent =
  | { type: 'submit'; text: string; seed?: number }
  /** The user answered on paper. Counts as an answer, carries no text. */
  | { type: 'paper'; seed?: number }
  | { type: 'finish' }
  | { type: 'rephrase'; question: string }
  | { type: 'reset' };

export const initialTalk: TalkState = { step: 'listen' };

interface Topic {
  id: string;
  keywords: string[];
  questions: string[];
}

const TOPICS = bank.topics as Topic[];

export function detectTopic(text: string): string {
  const t = ` ${text.toLowerCase()} `;
  let best = 'other';
  let bestHits = 0;
  for (const topic of TOPICS) {
    const hits = topic.keywords.filter((k) => new RegExp(`\\b${k}\\b`).test(t)).length;
    if (hits > bestHits) {
      best = topic.id;
      bestHits = hits;
    }
  }
  return best;
}

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

export function firstQuestion(topic: string, seed: number): string {
  const t = TOPICS.find((x) => x.id === topic) ?? TOPICS[TOPICS.length - 1];
  return pick(t.questions, seed);
}

export function followUp(seed: number): string {
  return pick(bank.followUps, seed);
}

export function talkReducer(state: TalkState, event: TalkEvent): TalkState {
  if (event.type === 'reset') return initialTalk;
  if (state.step === 'close' || state.step === 'crisis') return state; // terminal

  if (event.type === 'rephrase') {
    if (state.step !== 'ask') return state;
    const messages = [...state.messages.slice(0, -1), { from: 'app' as const, text: event.question }];
    return { ...state, question: event.question, messages };
  }

  if (event.type === 'finish') {
    if (state.step === 'ask') return { step: 'close', messages: state.messages };
    return state;
  }

  // submit or paper
  const seed = event.seed ?? Math.floor(Math.random() * 1000);
  let mine: Message;
  if (event.type === 'paper') {
    mine = { from: 'you', text: '', paper: true };
  } else {
    const text = event.text.trim();
    if (!text) return state;
    if (hasCrisisSigns(text)) return { step: 'crisis' };
    mine = { from: 'you', text };
  }

  if (state.step === 'listen') {
    const topic = mine.paper ? 'other' : detectTopic(mine.text);
    const question = firstQuestion(topic, seed);
    return {
      step: 'ask',
      asked: 1,
      topic,
      question,
      messages: [mine, { from: 'app', text: question }],
    };
  }

  // state.step === 'ask'
  const messages: Message[] = [...state.messages, mine];
  if (state.asked >= MAX_QUESTIONS) return { step: 'close', messages };
  const question = followUp(seed);
  return {
    step: 'ask',
    asked: state.asked + 1,
    topic: state.topic,
    question,
    messages: [...messages, { from: 'app', text: question }],
  };
}
