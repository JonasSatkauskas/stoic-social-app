export function HelpScreen({ onDone }: { onDone: () => void }) {
  return (
    <section className="screen" aria-labelledby="help-title" role="alert">
      <h1 id="help-title">Please talk to a person now.</h1>
      <p>What you wrote sounds heavy. This app cannot help with this, but people can, today.</p>
      <ul className="help-list">
        <li>
          If you are in danger right now, call your local emergency number: <strong>112</strong> in Europe,{' '}
          <strong>911</strong> in the US and Canada.
        </li>
        <li>
          Find a free, confidential helpline in your country at{' '}
          <a href="https://findahelpline.com" target="_blank" rel="noreferrer noopener">
            findahelpline.com
          </a>
          .
        </li>
        <li>Tell someone near you how you feel. You do not have to explain it well.</li>
      </ul>
      <div className="space" />
      <button className="btn quiet" onClick={onDone}>
        Back to today
      </button>
    </section>
  );
}
