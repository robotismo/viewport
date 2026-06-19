// Dynamic-resolution governor. The M2 Pro's ceiling is fillrate at Retina DPR
// with stacked fullscreen passes, so the primary lever is render scale.
// Conservative: only step DPR down after sustained budget misses; recover slowly.

const STEPS = [1.0, 1.15, 1.3, 1.5, 2.0];

export class PerfMonitor {
  fps = 60;
  private accTime = 0;
  private accFrames = 0;
  private below = 0; // seconds spent below budget
  private above = 0; // seconds spent comfortably above
  private readonly targetFps: number;

  constructor(targetFps = 60) {
    this.targetFps = targetFps;
  }

  /** Returns the pixel ratio the renderer should use this frame. */
  sample(dt: number, current: number, max: number): number {
    this.accTime += dt;
    this.accFrames++;
    if (this.accTime < 0.5) return current;

    this.fps = this.accFrames / this.accTime;
    this.accTime = 0;
    this.accFrames = 0;

    const idx = nearestStep(current, max);
    let next = current;

    if (this.fps < this.targetFps - 8) {
      this.below += 0.5;
      this.above = 0;
      if (this.below >= 1.0 && idx > 0) {
        next = clampStep(STEPS[idx - 1], max);
        this.below = 0;
      }
    } else if (this.fps > this.targetFps - 2) {
      this.above += 0.5;
      this.below = 0;
      if (this.above >= 3.0 && idx < STEPS.length - 1) {
        const up = clampStep(STEPS[idx + 1], max);
        if (up <= max) next = up;
        this.above = 0;
      }
    } else {
      this.below = 0;
      this.above = 0;
    }
    return next;
  }
}

function clampStep(v: number, max: number): number {
  return Math.min(v, max);
}

function nearestStep(v: number, max: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i] > max + 1e-3) continue;
    const d = Math.abs(STEPS[i] - v);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
