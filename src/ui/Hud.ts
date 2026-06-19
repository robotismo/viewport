import type { Destination } from '../core/types';

/**
 * The diegetic observation-deck overlay: corner brackets framing the "glass",
 * a title block, a nav console for travelling between destinations, and a live
 * telemetry readout. All DOM — it sits above the canvas and never touches GL.
 */
export class Hud {
  private readonly title: HTMLElement;
  private readonly tagline: HTMLElement;
  private readonly intent: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly res: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly warpEl: HTMLElement;
  private readonly navButtons = new Map<string, HTMLButtonElement>();
  private warping = false;

  private readonly qualityButtons = new Map<string, HTMLButtonElement>();

  constructor(
    container: HTMLElement,
    private readonly destinations: Destination[],
    private readonly onSelect: (id: string) => void,
    private readonly onQuality: (q: 'low' | 'auto' | 'high') => void = () => {},
    initialQuality: 'low' | 'auto' | 'high' = 'auto',
  ) {
    const root = document.createElement('div');
    root.className = 'hud';
    root.innerHTML = `
      <div class="frame" aria-hidden="true">
        <span class="corner tl"></span><span class="corner tr"></span>
        <span class="corner bl"></span><span class="corner br"></span>
      </div>
      <div class="scanlines" aria-hidden="true"></div>
      <header class="title-block">
        <div class="eyebrow">VIEWPORT · OBSERVATION DECK</div>
        <h1 class="dest-name" aria-live="polite"></h1>
        <div class="dest-tagline"></div>
      </header>
      <aside class="nav-console" role="navigation" aria-label="Destinations">
        <div class="nav-head" aria-hidden="true">◆ NAV CONSOLE</div>
        <div class="nav-list" role="radiogroup" aria-label="Destination"></div>
        <div class="quality-control" role="radiogroup" aria-label="Render quality">
          <span class="qc-label" aria-hidden="true">QUALITY</span>
          <div class="qc-seg">
            <button class="qc-item" role="radio" data-q="low" aria-checked="false" aria-label="Low quality">LOW</button>
            <button class="qc-item" role="radio" data-q="auto" aria-checked="false" aria-label="Auto quality">AUTO</button>
            <button class="qc-item" role="radio" data-q="high" aria-checked="false" aria-label="High quality">HIGH</button>
          </div>
        </div>
        <div class="nav-hint" aria-hidden="true">DRAG TO LOOK · SCROLL TO ZOOM</div>
      </aside>
      <footer class="telemetry">
        <div class="intent"></div>
        <div class="readout">
          <span class="rd"><b>FPS</b> <span class="fps">—</span></span>
          <span class="rd"><b>RENDER</b> <span class="res">—</span></span>
          <span class="rd"><b>STATUS</b> <span class="ok">NOMINAL</span></span>
        </div>
      </footer>
      <div class="warp"></div>
    `;
    container.appendChild(root);

    this.title = root.querySelector('.dest-name')!;
    this.tagline = root.querySelector('.dest-tagline')!;
    this.intent = root.querySelector('.intent')!;
    this.fps = root.querySelector('.fps')!;
    this.res = root.querySelector('.res')!;
    this.nav = root.querySelector('.nav-list')!;
    this.warpEl = root.querySelector('.warp')!;

    for (const d of this.destinations) {
      const b = document.createElement('button');
      b.className = 'nav-item';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-label', d.name);
      b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="nm">${d.name}</span>`;
      b.addEventListener('click', () => this.onSelect(d.id));
      this.nav.appendChild(b);
      this.navButtons.set(d.id, b);
    }

    for (const b of root.querySelectorAll<HTMLButtonElement>('.qc-item')) {
      const q = b.dataset.q as 'low' | 'auto' | 'high';
      b.addEventListener('click', () => {
        this.setQuality(q);
        this.onQuality(q);
      });
      this.qualityButtons.set(q, b);
    }
    this.setQuality(initialQuality);
  }

  /** Reflect the active quality segment (does not invoke the callback). */
  setQuality(q: 'low' | 'auto' | 'high'): void {
    for (const [id, b] of this.qualityButtons) {
      const on = id === q;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }

  setDestination(dest: Destination): void {
    this.title.textContent = dest.name;
    this.tagline.textContent = dest.tagline;
    this.intent.textContent = dest.intent;
    for (const [id, b] of this.navButtons) {
      const on = id === dest.id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }

  setTelemetry(fps: number, pixelRatio: number, w: number, h: number): void {
    this.fps.textContent = String(Math.round(fps));
    this.fps.classList.toggle('warn', fps < 50);
    this.res.textContent = `${Math.round(w * pixelRatio)}×${Math.round(h * pixelRatio)} · ${pixelRatio.toFixed(2)}x`;
  }

  /**
   * Warp flash that masks the destination swap mid-transition. Re-entrancy-safe:
   * ignores calls while a warp is in flight, and locks the nav for the duration
   * so a queued swap can't overwrite a BuiltWorld before its dispose() runs.
   */
  warp(swap: () => void): void {
    if (this.warping) return;
    this.warping = true;
    this.warpEl.classList.add('active');
    this.nav.style.pointerEvents = 'none';
    window.setTimeout(swap, 360);
    window.setTimeout(() => {
      this.warpEl.classList.remove('active');
      this.nav.style.pointerEvents = '';
      this.warping = false;
    }, 820);
  }
}
