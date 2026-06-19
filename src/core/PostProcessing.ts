import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import type { PostConfig } from './types';

// Diegetic "glass": gentle vignette + animated film grain, applied in linear
// HDR before tone mapping so the falloff reads like real lens darkening.
const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.5 },
    grain: { value: 0.04 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    varying vec2 vUv;
    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.95, 0.25, length(d) * 1.41421);
      c.rgb *= mix(1.0, v, vignette);
      float g = (hash(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * grain;
      c.rgb += g;
      gl_FragColor = c;
    }
  `,
};

// Screen-space lens flare: ghosts + halo + chromatic dispersion sampled from the
// genuinely-bright (HDR > 1) features of the already-bloomed image, pulled toward
// screen centre. Asset-free; intensity is per-destination (0 = off).
const LensFlareShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uIntensity: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;

    vec3 bright(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0);
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Cap each tap so the searing core can't spike into discrete beads; the
      // streak then forms from the (soft, wide) bloom halo.
      return min(c, vec3(2.5)) * smoothstep(1.2, 4.0, l);
    }

    // Horizontal anamorphic streak: a wide, triangular-weighted blur of the
    // brightest cores along X. Reads unmistakably as a lens artifact (never as
    // an object), cool-tinted like a real anamorphic lens.
    void main() {
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      if (uIntensity <= 0.0) { gl_FragColor = vec4(base, 1.0); return; }

      vec3 streak = vec3(0.0);
      float wsum = 0.0;
      for (int i = -28; i <= 28; i++) {
        float t = float(i) / 28.0;
        float w = 1.0 - abs(t);
        w *= w;
        streak += bright(vUv + vec2(t * 0.2, 0.0)) * w;
        wsum += w;
      }
      streak /= wsum;
      streak *= vec3(0.55, 0.8, 1.35); // cool anamorphic tint
      gl_FragColor = vec4(base + streak * uIntensity, 1.0);
    }
  `,
};

/**
 * Deliberate post stack: render (linear HDR) → bloom → lens flare →
 * vignette/grain → ACES tone map + sRGB (OutputPass) → SMAA edge AA. HalfFloat
 * targets keep stellar highlights in HDR so bloom blooms off real over-1.0 values.
 */
export class PostProcessing {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private readonly renderPass: RenderPass;
  private readonly vignette: ShaderPass;
  private readonly flare: ShaderPass;
  private readonly output: OutputPass;
  private readonly smaa: SMAAPass;
  private time = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 0,
    });
    this.composer = new EffectComposer(renderer, rt);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.6, 0.85);
    this.composer.addPass(this.bloom);

    this.flare = new ShaderPass(LensFlareShader);
    this.composer.addPass(this.flare);

    this.vignette = new ShaderPass(VignetteGrainShader);
    this.composer.addPass(this.vignette);

    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);
  }

  apply(p: PostConfig): void {
    this.bloom.strength = p.bloomStrength;
    this.bloom.radius = p.bloomRadius;
    this.bloom.threshold = p.bloomThreshold;
    this.vignette.uniforms.vignette.value = p.vignette;
    this.vignette.uniforms.grain.value = p.grain;
    this.flare.uniforms.uIntensity.value = p.flare ?? 0;
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render(dt: number): void {
    this.time += dt;
    this.vignette.uniforms.time.value = this.time;
    this.composer.render();
  }

  /**
   * Release every GPU resource in the stack. EffectComposer.dispose() only frees
   * its two ping-pong targets and copy pass — it does NOT dispose the passes it
   * was given — so each pass (bloom RTs, SMAA RTs + lookup textures, ShaderPass
   * materials) must be disposed explicitly here.
   */
  dispose(): void {
    this.renderPass.dispose();
    this.bloom.dispose();
    this.flare.dispose();
    this.vignette.dispose();
    this.output.dispose();
    this.smaa.dispose();
    this.composer.dispose();
  }
}
