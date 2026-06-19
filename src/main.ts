import './style.css';
import { Engine } from './core/Engine';
import { buildWorld } from './scene/World';
import { destinations, getDestination, DEFAULT_DESTINATION } from './destinations/registry';
import type { BuiltWorld } from './core/types';
import { Hud } from './ui/Hud';

const app = document.getElementById('app');
if (!app) throw new Error('#app container missing');

const engine = new Engine(app, {
  maxPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
  dynamicResolution: true,
});

let world: BuiltWorld | null = null;
let activeId = '';

function load(id: string): void {
  if (id === activeId) return;
  if (world) world.dispose();
  const dest = getDestination(id);
  world = buildWorld(dest, engine);
  hud.setDestination(dest);
  activeId = id;
}

const hud = new Hud(app, destinations, (id) => {
  if (id === activeId) return;
  hud.warp(() => load(id));
});

load(DEFAULT_DESTINATION);
engine.start();

// Telemetry tick (decoupled from the render loop).
window.setInterval(() => {
  hud.setTelemetry(
    engine.fps,
    engine.renderer.getPixelRatio(),
    app.clientWidth,
    app.clientHeight,
  );
}, 500);

// Expose for debugging / browser validation.
(window as unknown as { __viewport: unknown }).__viewport = { engine, load };
