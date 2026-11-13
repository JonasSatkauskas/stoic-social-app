import type { Line } from './lines';

export function LineToCarry({ line, label = 'A line to carry', compact = false }: { line: Line; label?: string; compact?: boolean }) {
  return (
    <figure className={`carry ${compact ? 'compact' : ''}`}>
      {!compact && <div className="eyebrow">{label}</div>}
      <blockquote>{line.text}</blockquote>
      <figcaption>
        {line.author}, <cite>{line.work}</cite>
      </figcaption>
      <p className="carry-practice">{line.practice}</p>
    </figure>
  );
}
