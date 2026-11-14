import { useEffect, useReducer, useState } from 'react';
import bank from '../../data/questions.json';
import { rephraseQuestion } from '../../lib/ai';
import { hasCrisisSigns } from '../../lib/safety';
import { useStore } from '../../lib/store';
import { HelpScreen } from './HelpScreen';
import { initialTalk, talkReducer } from './machine';

const SHARE_TEXT = 'Do you have a few minutes to talk today? Nothing urgent. I would like to hear how you are.';

export function TalkScreen() {
  const [state, dispatch] = useReducer(talkReducer, initialTalk);
  const [text, setText] = useState('');
  const { challenge, go } = useStore();
  const [shared, setShared] = useState<string | null>(null);
  const [onPaper, setOnPaper] = useState(false);
  const [quote] = useState(() => bank.quotes[Math.floor(Math.random() * bank.quotes.length)]);

  // Optional on-device rephrasing of the first question. Falls back silently.
  const firstAsk = state.step === 'ask' && state.asked === 1 ? state : null;
  useEffect(() => {
    if (!firstAsk) return;
    let live = true;
    const userText = firstAsk.messages[0].text;
    if (!userText || hasCrisisSigns(userText)) return;
    void rephraseQuestion(firstAsk.question, userText).then((q) => {
      if (live && q !== firstAsk.question) dispatch({ type: 'rephrase', question: q });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstAsk?.messages[0]?.text]);

  const submit = () => {
    dispatch({ type: 'submit', text });
    setText('');
  };

  const leave = () => {
    dispatch({ type: 'reset' });
    go('today');
  };

  if (state.step === 'crisis') return <HelpScreen onDone={leave} />;

  if (state.step === 'close') {
    const lastQuestion = [...state.messages].reverse().find((m) => m.from === 'app')?.text;
    const transcript = state.messages.map((m) => (m.from === 'you' ? (m.paper ? '(written on paper)' : m.text) : `> ${m.text}`)).join('\n\n');

    const share = async () => {
      try {
        if (navigator.share) {
          await navigator.share({ text: SHARE_TEXT });
          setShared('Sent. Now let them answer.');
        } else {
          await navigator.clipboard.writeText(SHARE_TEXT);
          setShared('Copied. Paste it to someone you trust.');
        }
      } catch {
        /* cancelled */
      }
    };

    return (
      <section className="screen" aria-labelledby="close-title">
        <h1 id="close-title">Now put the phone down.</h1>
        <ol className="close-steps">
          <li>
            <div className="eyebrow">1. Paper</div>
            <p className="serif" style={{ fontSize: '1.2rem', margin: 0 }}>
              Write your answer on paper.
            </p>
            {lastQuestion && <p className="muted small" style={{ margin: '0.4rem 0 0' }}>{lastQuestion}</p>}
          </li>
          <li>
            <div className="eyebrow">2. A challenge</div>
            <button className="tertiary" style={{ padding: '4px 0', color: 'var(--ink)', fontSize: '1.05rem' }} onClick={leave}>
              {challenge.title}
            </button>
          </li>
          <li>
            <div className="eyebrow">3. A real person</div>
            <p style={{ margin: '0 0 0.6rem' }}>Tell one real person how you are.</p>
            <button className="btn quiet" onClick={() => void share()}>
              Send a short message
            </button>
            {shared && (
              <p className="small muted" role="status" style={{ margin: '0.5rem 0 0' }}>
                {shared}
              </p>
            )}
          </li>
        </ol>
        <blockquote className="quote">
          {quote.text}
          <cite>
            {quote.author}, {quote.work}
          </cite>
        </blockquote>
        <div className="links">
          <button className="tertiary" onClick={() => go('notes', { text: transcript })}>
            Save to notes
          </button>
          <button className="tertiary" onClick={leave}>
            Close
          </button>
        </div>
        <p className="center muted small">If you close without saving, this conversation is gone.</p>
      </section>
    );
  }

  const asking = state.step === 'ask' ? state : null;
  const lastYou = asking ? [...asking.messages].reverse().find((m) => m.from === 'you') : null;

  if (onPaper) {
    return (
      <section className="screen pen" aria-labelledby="paper-title">
        <p className="talk-label">Reflection partner, not a therapist.</p>
        <div className="eyebrow center">On paper</div>
        <h1 id="paper-title" className="prompt">
          {asking ? asking.question : 'Write what is on your mind.'}
        </h1>
        <p className="center muted">Write by hand. Take the time you need. The app will not see it.</p>
        <div className="space" />
        <button
          className="btn"
          onClick={() => {
            setOnPaper(false);
            dispatch({ type: 'paper' });
          }}
        >
          Done writing
        </button>
        <div className="links">
          <button className="tertiary" onClick={() => setOnPaper(false)}>
            Type instead
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen talk" aria-labelledby="talk-title">
      <p className="talk-label">Reflection partner, not a therapist.</p>
      {asking ? (
        <>
          {lastYou && (
            <p className="bubble-you">{lastYou.paper ? 'You wrote this one on paper.' : lastYou.text}</p>
          )}
          <h2 id="talk-title" className="question" aria-live="polite">
            {asking.question}
          </h2>
        </>
      ) : (
        <>
          <h1 id="talk-title">Talk it out, then go.</h1>
          <p className="muted">Write what is on your mind. I will ask one or two questions. Then you go back to your day.</p>
        </>
      )}
      <label htmlFor="talk-text" className="visually-hidden">
        {asking ? 'Your answer' : 'What is on your mind'}
      </label>
      <textarea
        id="talk-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={asking ? 'Your answer' : 'What happened?'}
      />
      <p className="field-hint">
        <span>Not stored, not sent.</span>
      </p>
      <div className="talk-actions">
        <button className="btn" disabled={!text.trim()} onClick={submit}>
          {asking ? 'Answer' : 'Ask me'}
        </button>
        <button className="btn quiet" onClick={() => setOnPaper(true)}>
          Answer on paper
        </button>
        {asking && (
          <div className="links">
            <button className="tertiary" onClick={() => dispatch({ type: 'finish' })}>
              That is enough for now
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
