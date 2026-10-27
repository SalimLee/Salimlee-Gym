/**
 * FocusField (B.5.7) — die Übersetzung von „beweg dich, der Fokus folgt".
 *
 * Ein Canvas über dem Hero-Video: Poisson-Unschärfe mit 12 Abtastpunkten,
 * scharf um den Fokuspunkt, weich außen. Die UV wird über eine OGL-Flowmap
 * verschoben, so zieht das Bild hinter der Maus nach. Der Fokuspunkt folgt der
 * Maus (lerp 0.08) und wandert nach 2,5 s Ruhe zurück auf Salims Gesicht.
 *
 * Wird dynamisch geladen (eigener Chunk), nur Desktop mit Maus, nur wenn WebGL
 * da ist und keine reduzierte Bewegung gewünscht wird. Rendert nicht, wenn der
 * Hero unsichtbar oder der Tab versteckt ist.
 */
import { Flowmap, Mesh, Program, Renderer, Texture, Triangle, Vec2 } from "ogl";

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tFlow;
uniform vec2 uCover;
uniform vec2 uFocus;
uniform float uMaxBlur;
uniform float uFocusR;
uniform float uFeather;
uniform float uAspect;
varying vec2 vUv;

void main() {
  // cover-fit
  vec2 uv = (vUv - 0.5) * uCover + 0.5;

  // Zug: UV hinter der Bewegung nachziehen
  vec3 flow = texture2D(tFlow, vUv).rgb;
  uv += flow.xy * 0.03;

  // Abstand zum Fokuspunkt (seitenverhaeltnis-korrigiert)
  vec2 d = vUv - uFocus;
  d.x *= uAspect;
  float b = mix(0.0, uMaxBlur, smoothstep(uFocusR, uFocusR + uFeather, length(d)));

  // 12 Poisson-Abtastpunkte, entrollt:
  // GLSL ES 1.00 (WebGL) kennt keine Array-Konstruktoren.
  vec3 col = texture2D(tMap, uv).rgb;
  col += texture2D(tMap, uv + vec2( 0.000,  0.500) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.433,  0.250) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.433, -0.250) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.000, -0.500) * b).rgb;
  col += texture2D(tMap, uv + vec2(-0.433, -0.250) * b).rgb;
  col += texture2D(tMap, uv + vec2(-0.433,  0.250) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.000,  0.900) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.779,  0.450) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.779, -0.450) * b).rgb;
  col += texture2D(tMap, uv + vec2( 0.000, -0.900) * b).rgb;
  col += texture2D(tMap, uv + vec2(-0.779, -0.450) * b).rgb;
  col += texture2D(tMap, uv + vec2(-0.779,  0.450) * b).rgb;
  col /= 13.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

export type FocusFieldOptions = {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  /** Ruhepunkt (Salims Gesicht) als UV, aus content/media.ts */
  rest: [number, number];
  onReady?: () => void;
};

export class FocusField {
  private renderer: Renderer;
  private mesh!: Mesh;
  private texture!: Texture;
  private flowmap: Flowmap | null = null;
  private blankFlow!: Texture;
  private flowWarned = false;
  private raf = 0;
  private destroyed = false;
  private visible = true;

  private mouse = new Vec2(0.5, 0.5);
  private velocity = new Vec2(0, 0);
  private last = new Vec2(0.5, 0.5);
  private lastTime = 0;

  private focus: [number, number];
  private target: [number, number];
  private rest: [number, number];
  private idleSince = 0;
  private breathe = 0;

  private io?: IntersectionObserver;

  constructor(private opts: FocusFieldOptions) {
    this.rest = opts.rest;
    this.focus = [...opts.rest] as [number, number];
    this.target = [...opts.rest] as [number, number];

    this.renderer = new Renderer({
      canvas: opts.canvas,
      alpha: false,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    });

    const gl = this.renderer.gl;
    gl.clearColor(0.027, 0.075, 0.122, 1);

    this.texture = new Texture(gl, { generateMipmaps: false, flipY: true });
    // Neutrale Ersatz-Flowmap (kein Zug), falls die echte nicht geht
    this.blankFlow = new Texture(gl, {
      image: new Uint8Array([0, 0, 0, 255]),
      width: 1,
      height: 1,
      generateMipmaps: false,
    });
    try {
      // Braucht Half-Float-Render-Targets; auf schwachen GPUs nicht verfuegbar.
      this.flowmap = new Flowmap(gl, { falloff: 0.22, dissipation: 0.965 });
    } catch {
      this.flowmap = null;
    }

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        tMap: { value: this.texture },
        tFlow: this.flowmap ? this.flowmap.uniform : { value: this.blankFlow },
        uCover: { value: new Vec2(1, 1) },
        uFocus: { value: new Vec2(this.rest[0], this.rest[1]) },
        uMaxBlur: { value: 0.0065 },
        uFocusR: { value: 0.16 },
        uFeather: { value: 0.22 },
        uAspect: { value: 1 },
      },
    });
    // Kompiliert der Shader nicht, werfen wir -> der Hero bleibt beim <video>.
    if (!gl.getProgramParameter((program as unknown as { program: WebGLProgram }).program, gl.LINK_STATUS)) {
      throw new Error("FocusField: Shader konnte nicht gelinkt werden");
    }

    this.mesh = new Mesh(gl, { geometry, program });

    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);

    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.01 },
    );
    this.io.observe(opts.canvas);

    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private resize = () => {
    const { canvas, video } = this.opts;
    // Groesse vom Elternelement nehmen; OGL setzt sonst style.width/height
    // auf die Canvas-Default-Groesse (300x150) und bricht das Layout.
    const rect = canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect?.width || canvas.clientWidth || window.innerWidth));
    const h = Math.max(1, Math.round(rect?.height || canvas.clientHeight || window.innerHeight));
    this.renderer.setSize(w, h);
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const vw = video.videoWidth || 16;
    const vh = video.videoHeight || 9;
    const canvasRatio = w / h;
    const mediaRatio = vw / vh;
    const cover =
      canvasRatio > mediaRatio
        ? [1, canvasRatio / mediaRatio]
        : [mediaRatio / canvasRatio, 1];
    const u = this.mesh.program.uniforms;
    (u.uCover.value as Vec2).set(cover[0], cover[1]);
    u.uAspect.value = canvasRatio;
  };

  private onMove = (e: PointerEvent) => {
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    this.mouse.set(x, 1 - y);
    this.target = [x, y];
    this.idleSince = performance.now();
  };

  private onVisibility = () => {
    this.visible = !document.hidden;
  };

  private loop = (time: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden) return;

    const { video } = this.opts;
    const dt = Math.max(1, time - this.lastTime);
    this.lastTime = time;

    // Video als Textur, nur solange es läuft
    if (video.readyState >= 2) {
      if (!this.texture.image) this.opts.onReady?.();
      this.texture.image = video as unknown as HTMLImageElement;
      this.texture.needsUpdate = true;
    }

    // Flowmap-Geschwindigkeit
    this.velocity.set(
      ((this.mouse.x - this.last.x) / dt) * 1000,
      ((this.mouse.y - this.last.y) / dt) * 1000,
    );
    this.last.copy(this.mouse);
    if (this.flowmap) {
      try {
        this.flowmap.aspect = this.mesh.program.uniforms.uAspect.value as number;
        this.flowmap.mouse.copy(this.mouse);
        this.flowmap.velocity.lerp(this.velocity, 0.12);
        this.flowmap.update();
      } catch (err) {
        // Einmal melden, dann den Zug dauerhaft abschalten – Fokus laeuft weiter.
        if (!this.flowWarned) {
          this.flowWarned = true;
          console.warn("FocusField: Flowmap deaktiviert (kein Zug)", err);
        }
        this.flowmap = null;
        this.mesh.program.uniforms.tFlow = { value: this.blankFlow };
      }
    }

    // Fokuspunkt: folgt der Maus, nach 2,5 s Ruhe zurück auf Salims Gesicht
    const idle = time - this.idleSince > 2500;
    let tx = this.target[0];
    let ty = this.target[1];
    if (idle) {
      this.breathe += dt * 0.0006;
      tx = this.rest[0] + Math.sin(this.breathe) * 0.012;
      ty = this.rest[1] + Math.cos(this.breathe * 0.8) * 0.008;
    }
    this.focus[0] += (tx - this.focus[0]) * 0.08;
    this.focus[1] += (ty - this.focus[1]) * 0.08;
    (this.mesh.program.uniforms.uFocus.value as Vec2).set(
      this.focus[0],
      this.focus[1],
    );

    this.renderer.render({ scene: this.mesh });
  };

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.io?.disconnect();
  }
}
