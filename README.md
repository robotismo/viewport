# VIEWPORT — an immersive space observation deck

You are standing at the observation window of a ship. Outside is the cosmos. From
the nav console you travel between a curated set of destinations — a star up close,
a living ocean world, a ringed gas giant, a volumetric nebula, and the home system
that frames them all. Everything you see is rendered in real time in the browser
with [Three.js](https://threejs.org) and hand-written GLSL.

**Live site:** https://robotismo.github.io/viewport/

> The acceptance test for this project is not "a space demo." It is the feeling of
> being *there*. Each destination is tuned against that bar.

---

## Run / build / deploy

```bash
npm install      # install deps
npm run dev      # dev server with HMR  → http://localhost:5188
npm run build    # typecheck + production build → dist/
npm run preview  # serve the production build locally
npm run typecheck
npm test         # vitest: destination-config validation
```

**Controls.** Drag to look, scroll to zoom, click a destination or press **1–5** /
**↑↓** to travel. Destinations are deep-linkable (`/#ocean-world`). Honors
`prefers-reduced-motion` (no warp/auto-rotate), recovers from WebGL context loss,
and shows a graceful message if WebGL2 is unavailable.

**Deploy.** Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds
and publishes `dist/` to GitHub Pages. The Vite `base` is `'./'` (relative asset
URLs), so the build runs unchanged on a Pages project subpath or any static host
(Cloudflare Pages, Netlify, S3, …) — just serve `dist/`.

---

## The destinations

| # | Name | What it is | Why it feels like being there |
|---|------|-----------|-------------------------------|
| 1 | **SOL SYSTEM** | Home / establishing view | The family of worlds laid out around their star so you can read the system at a glance, then depart. |
| 2 | **SOL** | Photosphere approach | A surface that is never still — convection granulation boils and drifts, the limb burns brighter than the disc, the corona breathes. Bloom makes it a light source you want to shield your eyes from. |
| 3 | **KEPLER OCEANIS** | Temperate ocean world | A living world hanging in the dark: a blue scattering halo on the day limb, a gold sunset band across the terminator, and city-light constellations flickering on across the night hemisphere. |
| 4 | **AURELIA** | Ringed gas giant | Banded gold clouds wearing a disc of a billion ice shards, lit edge-on so the planet bites a curved shadow notch out of the rings. |
| 5 | **THE VEIL** | Emission nebula | No surface, no horizon — light suspended in gas that has real volume. Parallax slides the foreground wisps against the background as you move, proving the cloud is 3D, not a painted backdrop. |

Drag to look, scroll to zoom. Selecting a destination plays a warp transition that
masks the lazy build of the next world.

---

## Performance

Tuned and measured on the target machine:

- **Hardware:** MacBook Pro 14" (M2 Pro, 16-core GPU, 16 GB unified), Liquid Retina
  XDR (3024×1964 native, 120 Hz ProMotion), macOS 26.5, Chrome.
- **Contract:** 60 FPS floor at the default scaled resolution, DPR capped at 1.5
  with dynamic resolution scaling.
- **Measured (production build, in-browser, 1512×945 logical @ 1.5× DPR =
  ~2268×1418 render):**
  - SOL SYSTEM / SOL / KEPLER OCEANIS / AURELIA: **120 FPS** (ProMotion cap).
  - THE VEIL (raymarched volumetric nebula, 44 steps): **120 FPS** — the heaviest
    scene still pegs the refresh ceiling, so there is ~2× headroom over the 60 FPS
    contract everywhere.
  - Clean console, zero WebGL warnings; window-resize re-derives camera aspect and
    all render targets correctly; warp navigation tears down and rebuilds each world
    with no leaks.

  The 60 FPS floor and DPR-1.5 cap are deliberately conservative so the experience
  stays smooth if the machine is thermally throttled, on battery, or sharing the
  GPU — the `PerfMonitor` only ever needs to step down under those conditions.

**The lever on this machine is fillrate**, not shader math — the M2 Pro eats analytic
shaders, but stacked fullscreen post passes at full Retina DPR are the cost. So the
pixel ratio is capped at 1.5 and a `PerfMonitor` steps render scale down if the
frame budget is missed (DPR ladder), recovering when headroom returns.

---

## Rendering pipeline

A deliberate post stack, treated as a first-class subsystem:

```
RenderPass (linear HDR, HalfFloat targets)
  → UnrealBloomPass            stellar / emissive glow off real >1.0 values
  → Vignette + film grain      diegetic "glass", applied in linear
  → OutputPass                 ACES Filmic tone map + sRGB
  → SMAAPass                   edge AA on the final image
```

Lighting is physically motivated: a single dominant star (a decay-free point light
so it behaves like a sun at any compressed distance) over a near-black ambient fill,
with per-destination exposure.

### Custom shaders (`src/shaders/`)

- **sun** — convective granulation (scrolling FBM), physically-correct limb
  darkening with a hot chromospheric rim, drifting sunspots, Reinhard knee so
  detail survives bloom, additive corona shell.
- **earthlike** — domain-warped fractal continents, oceans/ice/shelf, day/night
  terminator, night-side city lights, ocean specular, plus an **animated cloud
  shell** and an analytic atmospheric scattering shell (sun-gated limb glow →
  sunset band at the terminator).
- **rocky** — fbm rock tones, crater rings, polar frost, terminator.
- **gasgiant** — domain-warped zonal bands, a differentially-rotating great-spot
  vortex, terminator, and the **ring shadow cast across the clouds** (ray-to-ring-
  plane test).
- **rings** — procedural ringlets + Cassini division, planet-shadow notch, and a
  Henyey-Greenstein forward-scatter + opposition phase function.
- **nebula** — raymarched FBM volume (analytic bounding sphere); emission +
  transmittance with dark Bok globules and embedded-star in-scatter.
- **starfield** — procedural points + a luminous Milky Way band shell (shared).
- **post** — screen-space anamorphic lens-flare streak off bright HDR sources.

All noise is shared via `src/shaders/lib/noise.glsl` (`#include`).

---

## Architecture

Data-driven. One engine consumes a typed `Destination` config; adding a destination
is **data, not new code paths**.

```
src/
  core/         Engine (renderer + loop + resize + dynamic res + context-loss),
                PostProcessing, CameraRig (orbit + warp arrival), PerfMonitor,
                types.ts ← the Destination contract, validate.ts (+ .test.ts)
  scene/        World (build/teardown), bodies (dispatcher), Starfield,
                builders/ (earthlike, gasgiant, rocky, rings, nebula)
  shaders/      GLSL (.vert/.frag) + lib/noise.glsl
  destinations/ one config file per destination + registry
  ui/           Hud (window frame, nav console, telemetry, warp)
```

**Stack:** Three.js r184 · Vite 8 · TypeScript 6 (strict) · `vite-plugin-glsl`.
WebGL2 + GLSL (WebGPU evaluated and deferred for v1).

---

## Assets & attribution

**There are no third-party visual assets.** Every planet, star, ring, nebula and the
starfield is generated procedurally in GLSL — no NASA imagery, no texture downloads,
no mesh assets. This was a deliberate divergence from a texture-based pipeline: it
eliminates the KTX2/Basis/Draco asset pipeline and all licensing/attribution burden,
keeps the bundle tiny (code only), and makes every destination load instantly.

Third-party code: [Three.js](https://github.com/mrdoob/three.js) and its postprocessing
addons (MIT), `vite-plugin-glsl` (MIT), Vite (MIT).
