import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraConfig } from './types';

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOutCubic = (k: number) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

interface Arrival {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  onDone?: () => void;
}

/**
 * Constrained orbit controls with a cinematic "warp arrival": on entering a
 * destination the camera flies in from a distant point and settles, then hands
 * control back to the user. The window frame stays fixed in screen space.
 */
export class CameraRig {
  readonly controls: OrbitControls;
  private arrival: Arrival | null = null;
  private target = new THREE.Vector3();

  constructor(
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
    private reducedMotion = false,
  ) {
    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.45;
    this.controls.zoomSpeed = 0.7;
    this.controls.enablePan = false;
  }

  configure(cfg: CameraConfig): void {
    this.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
    this.controls.target.copy(this.target);
    this.controls.minDistance = cfg.minDistance ?? 0.1;
    this.controls.maxDistance = cfg.maxDistance ?? 5000;
    this.controls.autoRotate = this.reducedMotion ? false : (cfg.autoRotate ?? false);
    this.controls.autoRotateSpeed = cfg.autoRotateSpeed ?? 0.2;

    const rest = new THREE.Vector3(cfg.position[0], cfg.position[1], cfg.position[2]);
    if (cfg.arriveFrom && !this.reducedMotion) {
      const from = new THREE.Vector3(cfg.arriveFrom[0], cfg.arriveFrom[1], cfg.arriveFrom[2]);
      this.camera.position.copy(from);
      this.controls.enabled = false;
      this.arrival = { from, to: rest, t: 0, duration: 1.8 };
    } else {
      this.camera.position.copy(rest);
      this.controls.enabled = true;
    }
    this.camera.lookAt(this.target);
    this.controls.update();
  }

  /** True while a cinematic arrival is playing. */
  get arriving(): boolean {
    return this.arrival !== null;
  }

  update(dt: number): void {
    if (this.arrival) {
      const a = this.arrival;
      a.t += dt;
      const k = Math.min(a.t / a.duration, 1);
      this.camera.position.lerpVectors(a.from, a.to, easeInOutCubic(k));
      this.camera.lookAt(this.target);
      if (k >= 1) {
        this.arrival = null;
        this.controls.enabled = true;
        a.onDone?.();
      }
    }
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }

  // exposed for transient effects (e.g. warp dolly)
  get easing() {
    return { easeOutCubic, easeInOutCubic };
  }
}
