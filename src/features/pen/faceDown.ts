/**
 * Face-down detection with DeviceOrientation. Lying flat face up, beta is 0;
 * face down, beta is close to +180 or -180 and gamma close to 0.
 */
export function isFaceDown(beta: number | null, gamma: number | null): boolean {
  if (beta === null || gamma === null) return false;
  return Math.abs(beta) > 140 && Math.abs(gamma) < 40;
}

type PermissionFn = () => Promise<'granted' | 'denied'>;

/**
 * Must be called from a tap (iPhone asks for permission). Resolves to true when
 * orientation data really arrives; false means use a normal timer.
 */
export async function orientationAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
  const request = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission;
  if (request) {
    try {
      if ((await request()) !== 'granted') return false;
    } catch {
      return false;
    }
  }
  // Desktop browsers often expose the API but never send real values.
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.removeEventListener('deviceorientation', onEvent);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onEvent = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) done(true);
    };
    const timer = window.setTimeout(() => done(false), 1500);
    window.addEventListener('deviceorientation', onEvent);
  });
}

/**
 * Accumulates time only while `running` is true.
 */
export function advance(state: { elapsed: number; since: number | null }, running: boolean, now: number) {
  const elapsed = state.since !== null ? state.elapsed + (now - state.since) : state.elapsed;
  return { elapsed, since: running ? now : null };
}
