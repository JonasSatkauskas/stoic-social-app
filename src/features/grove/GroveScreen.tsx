import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addDays } from '../../lib/dates';
import { relayEnabled } from '../../lib/relay';
import { useStore } from '../../lib/store';
import { challengeById, LEVEL_LABEL } from '../today/challenges';
import { Tree } from '../tree/Tree';
import { daysSinceMet, doneToday, letGo, listFriends, metText, saveFriend, type Friend } from './friends';
import { PlantFlow } from './plant/PlantFlow';
import { pullUpdates, sendPebble } from './sync';
import { TrunkView } from './TrunkView';

type View = { name: 'scene' } | { name: 'trunk'; fp: string } | { name: 'plant' };

const SLOT = 128;
const GROUND = 300;
const TREE_W = 150;
const TREE_RATIO = 226 / 300;

function seedOf(fp: string) {
  return parseInt(fp.slice(0, 8), 16) || 1;
}

function depthOf(days: number) {
  if (days <= 7) return { scale: 1, lift: 0, mist: 0 };
  if (days <= 30) return { scale: 0.8, lift: 26, mist: 0.3 };
  return { scale: 0.64, lift: 48, mist: 0.5 };
}

export default function GroveScreen() {
  const { tree, today } = useStore();
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
  }, []);

  // Order: closest friends nearest to me, alternating right and left.
  const sorted = [...(friends ?? [])].sort((a, b) => daysSinceMet(a, today) - daysSinceMet(b, today));
  const right = sorted.filter((_, i) => i % 2 === 0);
  const left = sorted.filter((_, i) => i % 2 === 1).reverse();
  const slots: ({ kind: 'friend'; f: Friend } | { kind: 'me' } | { kind: 'plot' })[] = [
    ...left.map((f) => ({ kind: 'friend' as const, f })),
    { kind: 'me' as const },
    ...right.map((f) => ({ kind: 'friend' as const, f })),
    { kind: 'plot' as const },
  ];
  const minWidth = typeof window === 'undefined' ? 400 : Math.min(window.innerWidth, 520);
  const width = Math.max(minWidth, slots.length * SLOT + 80);
  const offset = (width - slots.length * SLOT) / 2;
  const xOf = (i: number) => offset + i * SLOT + SLOT / 2;
  const meIndex = left.length;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && view.name === 'scene') el.scrollLeft = xOf(meIndex) - el.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends?.length, view.name]);

  const visit = (f: Friend, x: number, y: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setView({ name: 'trunk', fp: f.fp });
    setZoom({ x, y });
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
  const pebblesForMe = (friends ?? []).flatMap((f) => f.pebblesFromThem.filter((d) => d >= weekAgo)).slice(0, 7);
  const myStageScale = 1.25;

  return (
    <section className="screen" aria-labelledby="grove-title">
      <h1 id="grove-title" className="visually-hidden">
        The Grove
      </h1>

      <div className="grove-scroll" ref={scroller} aria-hidden="true">
        <svg
          className="grove-scene"
          width={width}
          viewBox={`0 0 ${width} 360`}
          style={
            zoom
              ? { transformOrigin: `${zoom.x}px ${zoom.y}px`, transform: 'scale(2.4)', opacity: 0.2, transition: 'transform 0.5s ease-in, opacity 0.5s ease-in' }
              : undefined
          }
        >
          <path className="far-hill" d={`M0 ${GROUND - 70} Q ${width * 0.25} ${GROUND - 105} ${width * 0.5} ${GROUND - 78} T ${width} ${GROUND - 82}`} />
          <path className="hill" d={`M0 ${GROUND + 4} Q ${width * 0.3} ${GROUND - 12} ${width * 0.55} ${GROUND + 2} T ${width} ${GROUND} V 360 H 0 Z`} />

          {slots.map((s, i) => {
            const x = xOf(i);
            if (s.kind === 'me') {
              const w = TREE_W * myStageScale;
              const h = w * TREE_RATIO;
              return (
                <g key="me">
                  <Tree tree={tree} seed={7} compact box={{ x: x - w / 2, y: GROUND - h + 6, width: w, height: h }} label="Your tree" />
                  {pebblesForMe.map((_, k) => (
                    <ellipse key={k} className="pebble" cx={x - 18 + k * 7} cy={GROUND + 10 + (k % 2) * 3} rx={4.5} ry={3} />
                  ))}
                  <text className="name" x={x} y={GROUND + 32}>
                    You
                  </text>
                </g>
              );
            }
            if (s.kind === 'plot') {
              return (
                <g key="plot" className="plot" onClick={() => setView({ name: 'plant' })}>
                  <rect x={x - 50} y={GROUND - 80} width={100} height={130} fill="transparent" />
                  <ellipse className="plot-soil" cx={x} cy={GROUND + 4} rx={30} ry={7} />
                  <path d={`M${x} ${GROUND - 2} v-12 M${x - 6} ${GROUND - 8} h12`} stroke="var(--stone)" strokeWidth={1.2} strokeLinecap="round" />
                  <text className="name" x={x} y={GROUND + 32}>
                    Plant together
                  </text>
                </g>
              );
            }
            const f = s.f;
            const days = daysSinceMet(f, today);
            const { scale, lift, mist } = depthOf(days);
            const w = TREE_W * scale;
            const h = w * TREE_RATIO;
            const base = GROUND - lift;
            const lit = !!doneToday(f, today);
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
                <Tree tree={f.tree} seed={seedOf(f.fp)} compact box={{ x: x - w / 2, y: base - h + 6, width: w, height: h }} label={f.name} />
                {lit && (
                  <g>
                    <circle className="lantern-glow" cx={x + 26 * scale} cy={base - 4} r={14 * scale} />
                    <rect className="lantern" x={x + 22 * scale} y={base - 12 * scale} width={8 * scale} height={11 * scale} rx={2} />
                  </g>
                )}
                {f.pebbleSentOn === today && <ellipse className="pebble" cx={x - 20 * scale} cy={base + 4} rx={4} ry={2.8} />}
                {mist > 0 && <rect className="mist" x={x - w / 2 - 6} y={base - h - 6} width={w + 12} height={h + 30} opacity={mist} pointerEvents="none" />}
                <text className="name" x={x} y={base + 24} opacity={1 - mist * 0.6}>
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
                Let {menuFor.name}'s tree go?
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
                <button className="link" onClick={() => setConfirmLetGo(true)}>
                  Let this tree go
                </button>
                <button className="link" onClick={() => setMenuFor(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {friends && friends.length === 0 ? (
        <div className="center">
          <p className="serif" style={{ fontSize: '1.3rem' }}>
            Your grove is quiet.
          </p>
          <p className="muted">Friends are planted in person: you scan each other's phones, face to face.</p>
        </div>
      ) : (
        <p className="center muted small">Tap a tree to visit. Hold to leave a pebble. A lantern means they did today's challenge.</p>
      )}

      {pebblesForMe.length > 0 && (
        <p className="center small serif">Someone left a pebble by your tree. They see you.</p>
      )}

      <button className="btn" onClick={() => setView({ name: 'plant' })}>
        Plant together
      </button>

      {!relayEnabled && (friends?.length ?? 0) > 0 && (
        <p className="center muted small" style={{ marginTop: '1rem' }}>
          Updates arrive when you meet and scan again.
        </p>
      )}

      {/* Plain version for screen readers */}
      <div className="visually-hidden">
        <h2>Friends in your grove</h2>
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
