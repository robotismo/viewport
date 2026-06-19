import './style.css';
import { Engine } from './core/Engine';
import { buildWorld } from './scene/World';
import {
  destinations,
  getDestination,
  hasDestination,
  DEFAULT_DESTINATION,
} from './destinations/registry';
import type { BuiltWorld } from './core/types';
import { Hud } from './ui/Hud';

const app = document.getElementById('app');
if (!app) throw new Error('#app container missing');

// ── Capability gate ─────────────────────────────────────────────────────────
function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

if (!supportsWebGL2()) {
  app.innerHTML = `
    <div class="fallback">
      <div class="fallback-corner tl"></div><div class="fallback-corner br"></div>
      <h1>VIEWPORT</h1>
      <p>This observation deck renders with <b>WebGL2</b>, which this browser
      doesn't support or has disabled.</p>
      <p>Try a current version of Chrome, Edge, Firefox or Safari with hardware
      acceleration enabled.</p>
    </div>`;
} else {
  const teardown = boot(app);
  // HMR: tear the old engine (GL context), interval and listeners down before
  // the module re-runs, or every save leaks a WebGL context until the browser
  // hits its context cap and the page dies.
  if (import.meta.hot) {
    import.meta.hot.dispose(teardown);
  }
}

/** Boots the deck and returns a teardown that releases every owned resource. */
function boot(root: HTMLElement): () => void {
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  const engine = new Engine(root, {
    maxPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    dynamicResolution: true,
    reducedMotion,
  });

  let world: BuiltWorld | null = null;
  let activeId = '';
  let torn = false;

  function load(id: string): void {
    if (torn) return; // a warp timer may fire after teardown; don't build on a disposed engine
    if (world) world.dispose();
    const dest = getDestination(id);
    world = buildWorld(dest, engine);
    hud.setDestination(dest);
    activeId = id;
    if (location.hash.slice(1) !== id) {
      history.replaceState(null, '', `#${id}`);
    }
  }

  /** Navigate to a destination with the warp transition (deep-link aware). */
  function go(id: string, warp = true): void {
    if (id === activeId || !hasDestination(id)) return;
    if (warp) hud.warp(() => load(id));
    else load(id);
  }

  // Persisted render-quality preference (LOW / AUTO / HIGH).
  const rawQ = (() => {
    try {
      return localStorage.getItem('viewport-quality');
    } catch {
      return null;
    }
  })();
  const savedQuality: 'low' | 'auto' | 'high' =
    rawQ === 'low' || rawQ === 'high' ? rawQ : 'auto';
  engine.setQuality(savedQuality);

  const hud = new Hud(
    root,
    destinations,
    (id) => go(id),
    (q) => {
      engine.setQuality(q);
      try {
        localStorage.setItem('viewport-quality', q);
      } catch {
        /* private-mode / storage disabled — ignore */
      }
    },
    savedQuality,
  );

  // Initial destination: URL hash wins (shareable deep links), else default.
  const fromHash = location.hash.slice(1);
  load(hasDestination(fromHash) ? fromHash : DEFAULT_DESTINATION);
  engine.start();

  // All window listeners share one AbortController so teardown is a single call.
  const ac = new AbortController();
  const { signal } = ac;

  // Back/forward + manual URL edits.
  window.addEventListener(
    'hashchange',
    () => {
      const id = location.hash.slice(1);
      if (id && id !== activeId && hasDestination(id)) go(id);
    },
    { signal },
  );

  // Keyboard navigation: 1–9 jump, arrows cycle.
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = destinations.findIndex((d) => d.id === activeId);
      const n = destinations.length;
      if (e.key >= '1' && e.key <= String(Math.min(n, 9))) {
        go(destinations[Number(e.key) - 1].id);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        go(destinations[(i + 1) % n].id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        go(destinations[(i - 1 + n) % n].id);
      }
    },
    { signal },
  );

  // Telemetry tick (decoupled from the render loop).
  const telemetry = window.setInterval(() => {
    hud.setTelemetry(
      engine.fps,
      engine.renderer.getPixelRatio(),
      root.clientWidth,
      root.clientHeight,
    );
  }, 500);

  // Expose for debugging / browser validation.
  (window as unknown as { __viewport: unknown }).__viewport = { engine, load: go };

  return () => {
    torn = true;
    window.clearInterval(telemetry);
    ac.abort();
    if (world) world.dispose();
    world = null;
    engine.dispose();
    delete (window as unknown as { __viewport?: unknown }).__viewport;
  };
}
