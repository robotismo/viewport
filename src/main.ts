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
  boot(app);
}

function boot(root: HTMLElement): void {
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

  function load(id: string): void {
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

  const hud = new Hud(root, destinations, (id) => go(id));

  // Initial destination: URL hash wins (shareable deep links), else default.
  const fromHash = location.hash.slice(1);
  load(hasDestination(fromHash) ? fromHash : DEFAULT_DESTINATION);
  engine.start();

  // Back/forward + manual URL edits.
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== activeId && hasDestination(id)) go(id);
  });

  // Keyboard navigation: 1–9 jump, arrows cycle.
  window.addEventListener('keydown', (e) => {
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
  });

  // Telemetry tick (decoupled from the render loop).
  window.setInterval(() => {
    hud.setTelemetry(
      engine.fps,
      engine.renderer.getPixelRatio(),
      root.clientWidth,
      root.clientHeight,
    );
  }, 500);

  // Expose for debugging / browser validation.
  (window as unknown as { __viewport: unknown }).__viewport = { engine, load: go };
}
