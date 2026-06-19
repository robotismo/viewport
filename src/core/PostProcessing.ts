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

/**
 * Deliberate post stack: render (linear HDR) → bloom → vignette/grain →
 * ACES tone map + sRGB (OutputPass) → SMAA edge AA. HalfFloat targets keep
 * stellar highlights in HDR so bloom blooms off real over-1.0 values.
 */
export class PostProcessing {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private readonly vignette: ShaderPass;
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

    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.6, 0.85);
    this.composer.addPass(this.bloom);

    this.vignette = new ShaderPass(VignetteGrainShader);
    this.composer.addPass(this.vignette);

    this.composer.addPass(new OutputPass());
    this.composer.addPass(new SMAAPass());
  }

  apply(p: PostConfig): void {
    this.bloom.strength = p.bloomStrength;
    this.bloom.radius = p.bloomRadius;
    this.bloom.threshold = p.bloomThreshold;
    this.vignette.uniforms.vignette.value = p.vignette;
    this.vignette.uniforms.grain.value = p.grain;
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
}
