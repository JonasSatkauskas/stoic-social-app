/**
 * Crisis check for the Talk flow. Runs on every user message, before anything
 * else. Conservative on purpose: a false positive shows a help screen, which
 * is acceptable. Patterns are matched on normalised lowercase text.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/,
  /\bkill(ing)? my ?self\b/,
  /\bend(ing)? (my|it all|my own) li(fe|ves)\b/,
  /\bend it all\b/,
  /\btake my (own )?life\b/,
  /\b(want|wanna|going|plan(ning)?) to die\b/,
  /\bwish i (was|were) dead\b/,
  /\bbetter off dead\b/,
  /\bbetter off without me\b/,
  /\bno reason to live\b/,
  /\bnot worth living\b/,
  /\b(don'?t|do not|dont|no longer) want to (live|be alive|exist|be here|wake up)\b/,
  /\b(can'?t|cannot|can not) (go on|do this anymore|take it anymore|keep going)\b/,
  /\b(nothing|no point) (to live for|in living)\b/,
  /\bdisappear forever\b/,
  /\bself[- ]?harm/,
  /\b(hurt|hurting|harm|harming|cut|cutting) my ?self\b/,
  /\boverdose\b/,
  /\bhang(ing)? my ?self\b/,
  /\bjump(ing)? off\b/,
  /\b(he|she|they|someone|partner|husband|wife|boyfriend|girlfriend) (hits|hit|beats|beat|abuses|abused) me\b/,
  /\b(being|been|i am|i'm) (abused|raped)\b/,
  /\bkill (him|her|them|someone|somebody)\b/,
];

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasCrisisSigns(text: string): boolean {
  const t = normalise(text);
  return CRISIS_PATTERNS.some((p) => p.test(t));
}
