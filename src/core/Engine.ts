import * as THREE from 'three';
import { PostProcessing } from './PostProcessing';
import { CameraRig } from './CameraRig';
import { PerfMonitor } from './PerfMonitor';
import type { Destination, LightConfig, Updatable } from './types';

const col = (c: [number, number, number]) => new THREE.Color(c[0], c[1], c[2]);

export interface EngineOptions {
  maxPixelRatio?: number;
  dynamicResolution?: boolean;
}

/**
 * One engine. Owns the renderer, the deliberate post stack, the camera rig and
 * the frame loop. A Destination is data fed to loadWorld(); the engine never
 * grows a code path per destination.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly rig: CameraRig;
  readonly post: PostProcessing;
  readonly perf: PerfMonitor;

  private readonly container: HTMLElement;
  private readonly timer = new THREE.Timer();
  private readonly updatables = new Set<Updatable>();
  private readonly ro: ResizeObserver;
  private readonly maxPixelRatio: number;
  private readonly dynamicResolution: boolean;

  private starLight: THREE.PointLight;
  private ambient: THREE.AmbientLight;
  private running = false;

  constructor(container: HTMLElement, opts: EngineOptions = {}) {
    this.container = container;
    this.maxPixelRatio =
      opts.maxPixelRatio ?? Math.min(window.devicePixelRatio || 1, 1.5);
    this.dynamicResolution = opts.dynamicResolution ?? true;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // SMAA handles AA in the post stack
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(this.maxPixelRatio);
    this.renderer.setSize(this.w, this.h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.classList.add('viewport-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000003);

    this.camera = new THREE.PerspectiveCamera(50, this.w / this.h, 0.05, 60000);
    this.camera.position.set(0, 0, 12);

    // Dominant star light + near-black ambient fill. Space is dark.
    // decay = 0: the star lights bodies at any compressed distance like a sun.
    this.starLight = new THREE.PointLight(0xffffff, 3.0, 0, 0);
    this.starLight.position.set(0, 0, 0);
    this.scene.add(this.starLight);
    this.ambient = new THREE.AmbientLight(0x223044, 0.05);
    this.scene.add(this.ambient);

    this.rig = new CameraRig(this.camera, this.renderer.domElement);
    this.post = new PostProcessing(this.renderer, this.scene, this.camera);
    this.post.setSize(this.w, this.h, this.maxPixelRatio);

    this.perf = new PerfMonitor(60);

    // Note: we deliberately do NOT call timer.connect(document). rAF is already
    // throttled when the tab is backgrounded, and the dt clamp in tick() absorbs
    // the resume spike — connecting the Page Visibility API would freeze the
    // clock whenever the document reports hidden (e.g. headless/embedded).
    this.ro = new ResizeObserver(() => this.onResize());
    this.ro.observe(container);
  }

  private get w(): number {
    return this.container.clientWidth || window.innerWidth;
  }
  private get h(): number {
    return this.container.clientHeight || window.innerHeight;
  }

  add(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  register(u: Updatable): void {
    this.updatables.add(u);
  }
  unregister(u: Updatable): void {
    this.updatables.delete(u);
  }

  setLighting(cfg: LightConfig): void {
    this.starLight.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
    this.starLight.color = col(cfg.color);
    this.starLight.intensity = cfg.intensity;
    this.ambient.intensity = cfg.ambient;
  }

  setExposure(e: number): void {
    this.renderer.toneMappingExposure = e;
  }

  applyDestination(dest: Destination): void {
    this.setLighting(dest.light);
    this.post.apply(dest.post);
    this.setExposure(dest.post.exposure);
    if (dest.background) this.scene.background = col(dest.background);
    this.rig.configure(dest.camera);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer.reset();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private tick(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const t = this.timer.getElapsed();

    this.rig.update(dt);
    for (const u of this.updatables) u.update(dt, t);
    this.post.render(dt);

    if (this.dynamicResolution) {
      const current = this.renderer.getPixelRatio();
      const next = this.perf.sample(dt, current, this.maxPixelRatio);
      if (Math.abs(next - current) > 1e-3) {
        this.renderer.setPixelRatio(next);
        this.post.setSize(this.w, this.h, next);
      }
    }
  }

  private onResize(): void {
    const w = this.w;
    const h = this.h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(w, h, this.renderer.getPixelRatio());
  }

  get fps(): number {
    return this.perf.fps;
  }
}
