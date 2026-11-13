/**
 * Optional: Chrome's built-in, on-device Prompt API. Nothing leaves the device.
 * If it is missing or fails in any way, the original question is used.
 */
interface LMSession {
  prompt(input: string, opts?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface LMStatic {
  availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(opts?: { initialPrompts?: { role: string; content: string }[] }): Promise<LMSession>;
}

function api(): LMStatic | null {
  const g = globalThis as unknown as { LanguageModel?: LMStatic };
  return g.LanguageModel ?? null;
}

export async function aiAvailable(): Promise<boolean> {
  try {
    return (await api()?.availability()) === 'available';
  } catch {
    return false;
  }
}

const MAX_LEN = 200;

export async function rephraseQuestion(question: string, userText: string): Promise<string> {
  const lm = api();
  if (!lm || !(await aiAvailable())) return question;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  let session: LMSession | null = null;
  try {
    session = await lm.create({
      initialPrompts: [
        {
          role: 'system',
          content:
            'You rephrase one reflective question so it fits what the person wrote. Keep its meaning. One short sentence, calm and direct, ending with a question mark. No advice, no exclamation marks, no emojis, no religious words. Reply with the question only.',
        },
      ],
    });
    const out = (await session.prompt(`They wrote: "${userText.slice(0, 600)}"\nQuestion: ${question}`, { signal: ctrl.signal })).trim();
    const clean = out.replace(/^["'\s]+|["'\s]+$/g, '');
    if (!clean || clean.length > MAX_LEN || !clean.endsWith('?') || clean.includes('!')) return question;
    return clean;
  } catch {
    return question;
  } finally {
    clearTimeout(timer);
    session?.destroy();
  }
}
