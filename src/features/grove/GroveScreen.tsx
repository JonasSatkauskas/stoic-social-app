import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addDays } from '../../lib/dates';
import { relayEnabled } from '../../lib/relay';
import { useStore } from '../../lib/store';
import { challengeById, LEVEL_LABEL } from '../today/challenges';
import { Cairn, CAIRN_RATIO } from '../cairn/Cairn';
import { daysSinceMet, doneToday, letGo, listFriends, metText, saveFriend, type Friend } from './friends';
import { PlantFlow } from './plant/PlantFlow';
import { pullUpdates, sendPebble } from './sync';
import { TrunkView } from './TrunkView';

type View = { name: 'scene' } | { name: 'trunk'; fp: string } | { name: 'plant' };

const SLOT = 132;
const CAIRN_W = 150;
/** Space below the ground line for names and the trail. */
const BELOW = 66;

function seedOf(fp: string) {
  return parseInt(fp.slice(0, 8), 16) || 1;
}

function depthOf(days: number) {
  if (days <= 7) return { scale: 1, lift: 0, mist: 0 };
  if (days <= 30) return { scale: 0.8, lift: 26, mist: 0.3 };
  return { scale: 0.64, lift: 48, mist: 0.5 };
}

export default function GroveScreen() {
  const { cairn, today, data, setFlag } = useStore();
  const [showHelp, setShowHelp] = useState(!data.flags?.trailHelp);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [view, setView] = useState<View>({ name: 'scene' });
  const [menuFor, setMenuFor] = useState<Friend | null>(null);
  const [confirmLetGo, setConfirmLetGo] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const press = useRef<{ timer: number; long: boolean } | null>(null);

  const reload = async (pull: boolean) => {
    const list = pull ? await pullUpdates().catch(() => listFriends()) : await listFriends();
    setFriends(list);
  };

  useEffect(() => {
    void listFriends().then(setFriends);
    void reload(true);
    // The instructions are shown on the first visit only; the ? stone brings them back.
    if (!data.flags?.trailHelp) void setFlag('trailHelp', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Order: closest friends nearest to me, alternating right and left. The empty
  // spot for meeting someone new stands right beside my cairn, always in view.
  const sorted = [...(friends ?? [])].sort((a, b) => daysSinceMet(a, today) - daysSinceMet(b, today));
  const right = sorted.filter((_, i) => i % 2 === 0);
  const left = sorted.filter((_, i) => i % 2 === 1).reverse();
  const slots: ({ kind: 'friend'; f: Friend } | { kind: 'me' } | { kind: 'plot' })[] = [
    ...left.map((f) => ({ kind: 'friend' as const, f })),
    { kind: 'me' as const },
    { kind: 'plot' as const },
    ...right.map((f) => ({ kind: 'friend' as const, f })),
  ];
  // About three cairns fit across the screen; the scene fills about half the height
  // with sky and distant ridges above the ground.
  const viewportW = typeof window === 'undefined' ? 390 : Math.min(window.innerWidth, 520);
  const viewportH = typeof window === 'undefined' ? 800 : window.innerHeight;
  const unit = viewportW / (SLOT * 3.1);
  const scenePx = Math.max(260, Math.min(viewportH * 0.5, 480));
  const SCENE_H = scenePx / unit;
  const GROUND = SCENE_H - BELOW;
  const minWidth = viewportW / unit;
  const width = Math.max(minWidth, slots.length * SLOT + 60);
  const offset = (width - slots.length * SLOT) / 2;
  const xOf = (i: number) => offset + i * SLOT + SLOT / 2;
  const meIndex = left.length;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && view.name === 'scene') el.scrollLeft = (xOf(meIndex) + SLOT / 2) * unit - el.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends?.length, view.name]);

  const visit = (f: Friend, x: number, y: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setView({ name: 'trunk', fp: f.fp });
    setZoom({ x: x * unit, y: y * unit });
    window.setTimeout(() => {
      setZoom(null);
      setView({ name: 'trunk', fp: f.fp });
    }, 520);
  };

  const pointerDown = (f: Friend) => {
    const timer = window.setTimeout(() => {
      if (press.current) press.current.long = true;
      try {
        navigator.vibrate?.(20);
      } catch {
        /* ignore */
      }
      setConfirmLetGo(false);
      setMenuFor(f);
    }, 550);
    press.current = { timer, long: false };
  };
  const pointerUp = (f: Friend, x: number, y: number) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    if (!p.long) visit(f, x, y);
  };
  const pointerCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const leavePebble = async (f: Friend) => {
    if (f.pebbleSentOn === today) return;
    const next = { ...f, pebbleSentOn: today };
    await saveFriend(next);
    setFriends((all) => (all ?? []).map((x) => (x.fp === f.fp ? next : x)));
    setMenuFor(null);
    await sendPebble(next, today).catch(() => undefined);
  };

  if (view.name === 'plant') {
    return (
      <PlantFlow
        onDone={() => {
          setView({ name: 'scene' });
          void reload(false);
        }}
      />
    );
  }

  if (view.name === 'trunk') {
    const f = friends?.find((x) => x.fp === view.fp);
    if (f) return <TrunkView friend={f} onBack={() => setView({ name: 'scene' })} onPebble={() => void leavePebble(f)} />;
  }

  const weekAgo = addDays(today, -6);
  const pebbleFriends = (friends ?? []).filter((f) => f.pebblesFromThem.some((d) => d >= weekAgo));
  const pebbleCount = Math.min(7, pebbleFriends.length);
  const doneFriends = sorted.filter((f) => doneToday(f, today));
  const myScale = 1.25;

  return (
    <section className="screen trail" aria-labelledby="grove-title">
      <h1 id="grove-title" className="visually-hidden">
        The Trail
      </h1>

      <div className="grove-scroll" ref={scroller} aria-hidden="true">
        <svg
          className="grove-scene"
          width={width * unit}
          height={scenePx}
          viewBox={`0 0 ${width} ${SCENE_H}`}
          style={
            zoom
              ? { transformOrigin: `${zoom.x}px ${zoom.y}px`, transform: 'scale(2.4)', opacity: 0.2, transition: 'transform 0.5s ease-in, opacity 0.5s ease-in' }
              : undefined
          }
        >
          <defs>
            <filter id="lantern-blur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <path className="ridge" d={ridge(width, GROUND - SCENE_H * 0.62, 34, 3)} />
          <path className="far-hill" d={`M0 ${GROUND - 110} Q ${width * 0.25} ${GROUND - 150} ${width * 0.5} ${GROUND - 118} T ${width} ${GROUND - 124}`} />
          <path className="far-hill" d={`M0 ${GROUND - 52} Q ${width * 0.2} ${GROUND - 72} ${width * 0.45} ${GROUND - 58} T ${width} ${GROUND - 64}`} />
          <path className="hill" d={`M0 ${GROUND + 4} Q ${width * 0.3} ${GROUND - 12} ${width * 0.55} ${GROUND + 2} T ${width} ${GROUND} V ${SCENE_H} H 0 Z`} />
          <path
            className="trail-path"
            d={`M0 ${GROUND + 40} C ${width * 0.2} ${GROUND + 30}, ${width * 0.35} ${GROUND + 50}, ${width * 0.5} ${GROUND + 40} S ${width * 0.8} ${GROUND + 30}, ${width} ${GROUND + 42}`}
          />

          {slots.map((s, i) => {
            const x = xOf(i);
            if (s.kind === 'me') {
              const w = CAIRN_W * myScale;
              const h = w * CAIRN_RATIO;
              return (
                <g key="me">
                  <Cairn cairn={cairn} seed={7} compact box={{ x: x - w / 2, y: GROUND - h + 6, width: w, height: h }} label="Your cairn" />
                  {Array.from({ length: pebbleCount }, (_, k) => (
                    <ellipse key={k} className="pebble" cx={x - 30 + k * 9} cy={GROUND + 8 + (k % 2) * 3} rx={4.5} ry={3} />
                  ))}
                  <text className="name" x={x} y={GROUND + 26}>
                    You
                  </text>
                </g>
              );
            }
            if (s.kind === 'plot') {
              return (
                <g key="plot" className="plot" onClick={() => setView({ name: 'plant' })}>
                  <rect x={x - 56} y={GROUND - 70} width={112} height={120} fill="transparent" />
                  <ellipse className="plot-soil" cx={x} cy={GROUND + 4} rx={28} ry={6} />
                  <path d={`M${x - 11} ${GROUND - 1} q 1 -9 11 -9 q 10 0 11 9 z`} className="plot-stone" />
                  <text className="name" x={x} y={GROUND + 24}>
                    Meet someone
                  </text>
                  <text className="name sub" x={x} y={GROUND + 37}>
                    to place their stone
                  </text>
                </g>
              );
            }
            const f = s.f;
            const days = daysSinceMet(f, today);
            const { scale, lift, mist } = depthOf(days);
            const w = CAIRN_W * scale;
            const h = w * CAIRN_RATIO;
            const base = GROUND - lift;
            const lit = !!doneToday(f, today);
            const lx = x + w * 0.36;
            return (
              <g
                key={f.fp}
                className="friend"
                onPointerDown={() => pointerDown(f)}
                onPointerUp={() => pointerUp(f, x, base - h / 2)}
                onPointerLeave={pointerCancel}
                onPointerCancel={pointerCancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                <rect x={x - w / 2} y={base - h} width={w} height={h + 40} fill="transparent" />
                <Cairn cairn={f.cairn} seed={seedOf(f.fp)} compact box={{ x: x - w / 2, y: base - h + 6, width: w, height: h }} label={f.name} />
                {lit && (
                  <g className="lantern-group" transform={`translate(${lx} ${base}) scale(${scale})`}>
                    <circle className="lantern-glow" cx={0} cy={-9} r={11} filter="url(#lantern-blur)" />
                    <path className="lantern-handle" d="M-3 -17 q 3 -5 6 0" />
                    <path className="lantern" d="M-4.5 -16 h9 l -1 13 h-7 z" />
                    <path className="lantern-base" d="M-5.5 -3 h11" />
                  </g>
                )}
                {f.pebbleSentOn === today && <ellipse className="pebble" cx={x - w * 0.36} cy={base + 4} rx={4} ry={2.8} />}
                {mist > 0 && <rect className="mist" x={x - w / 2 - 6} y={base - h - 6} width={w + 12} height={h + 24} opacity={mist} pointerEvents="none" />}
                <text className="name" x={x} y={base + 24} opacity={1 - mist * 0.5}>
                  {f.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {menuFor && (
        <div className="card" role="dialog" aria-label={`Options for ${menuFor.name}`}>
          {confirmLetGo ? (
            <>
              <p className="serif" style={{ fontSize: '1.15rem' }}>
                Let {menuFor.name}'s cairn go?
              </p>
              <p className="small muted">This removes them and their keys from this phone. They keep what they already received.</p>
              <div className="stones">
                <button
                  className="stone"
                  onClick={async () => {
                    await letGo(menuFor.fp);
                    setFriends((all) => (all ?? []).filter((x) => x.fp !== menuFor.fp));
                    setMenuFor(null);
                  }}
                >
                  Let go
                </button>
                <button className="stone" onClick={() => setMenuFor(null)}>
                  Keep
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="serif" style={{ fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
                {menuFor.name}
              </p>
              <button className="btn quiet" disabled={menuFor.pebbleSentOn === today} onClick={() => void leavePebble(menuFor)}>
                {menuFor.pebbleSentOn === today ? 'You left a pebble today' : 'Leave a pebble'}
              </button>
              <div className="links">
                <button className="tertiary" onClick={() => setConfirmLetGo(true)}>
                  Let this cairn go
                </button>
                <button className="tertiary" onClick={() => setMenuFor(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="trail-summary">
        {friends && friends.length === 0 ? (
          <>
            <p className="serif trail-line">Your trail is quiet.</p>
            <p className="muted small">Friends are added only in person: you scan each other's phones, face to face.</p>
          </>
        ) : (
          <>
            {doneFriends.slice(0, 3).map((f) => (
              <p key={f.fp} className="serif trail-line">
                {f.name} did today's challenge. {LEVEL_LABEL[doneToday(f, today)!.l]}.
              </p>
            ))}
            {pebbleFriends.length > 0 && <p className="serif trail-line">{pebbleLine(pebbleFriends.map((f) => f.name))}</p>}
          </>
        )}
      </div>

      {showHelp && (friends?.length ?? 0) > 0 && (
        <p className="center muted small">Tap a cairn to visit. Hold to leave a pebble. A lantern means they did today's challenge.</p>
      )}

      <button className="btn" onClick={() => setView({ name: 'plant' })}>
        Place a stone together
      </button>

      <div className="links">
        {(friends?.length ?? 0) > 0 && (
          <button className="help-stone" aria-label={showHelp ? 'Hide how the trail works' : 'How the trail works'} aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}>
            ?
          </button>
        )}
      </div>

      {!relayEnabled && (friends?.length ?? 0) > 0 && (
        <p className="center muted small">Updates arrive when you meet and scan again.</p>
      )}

      {/* Plain version for screen readers */}
      <div className="visually-hidden">
        <h2>Friends on your trail</h2>
        <ul>
          {sorted.map((f) => {
            const done = doneToday(f, today);
            const last = f.completions[f.completions.length - 1];
            return (
              <li key={f.fp}>
                <button onClick={() => setView({ name: 'trunk', fp: f.fp })}>
                  {f.name}. {done ? `Did today's challenge, ${LEVEL_LABEL[done.l]}.` : 'Resting today.'} Last met in person{' '}
                  {metText(daysSinceMet(f, today))}.
                  {last ? ` Most recent challenge: ${challengeById(last.id)?.title ?? last.id}.` : ''}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** A distant mountain ridge drawn as one thin line. */
function ridge(width: number, y: number, amp: number, seed: number): string {
  let d = `M0 ${y + amp * 0.6}`;
  const steps = Math.max(6, Math.round(width / 70));
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * width;
    const h = Math.sin(i * 1.7 + seed) * 0.5 + Math.sin(i * 0.6 + seed * 2) * 0.5;
    d += ` L${x.toFixed(0)} ${(y + amp * 0.6 - h * amp).toFixed(1)}`;
  }
  return d;
}

function pebbleLine(names: string[]): string {
  if (names.length === 1) return `${names[0]} left a pebble by your cairn. They see you.`;
  const list = names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list} left pebbles by your cairn. They see you.`;
}
